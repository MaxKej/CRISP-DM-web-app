from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.http import urlsafe_base64_decode

from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .serializers import (
    RegisterSerializer,
    UserSerializer,
    LogoutSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)


User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class LogoutView(generics.GenericAPIView):
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            {"detail": "Wylogowano pomyślnie."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            {"detail": "Hasło zostało zmienione."},
            status=status.HTTP_200_OK,
        )


class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data["email"]

        users = User.objects.filter(
            email__iexact=email,
            is_active=True,
        )

        for user in users:
            uid = urlsafe_base64_encode(
                force_bytes(user.pk)
            )

            token = default_token_generator.make_token(
                user
            )

            reset_url = (
                "http://localhost:5173/reset-password/"
                f"{uid}/{token}/"
            )

            send_mail(
                subject="Resetowanie hasła - CRISP-DM",
                message=(
                    "Otrzymaliśmy prośbę o zresetowanie "
                    "hasła do Twojego konta.\n\n"
                    "Kliknij poniższy link, aby ustawić "
                    "nowe hasło:\n\n"
                    f"{reset_url}\n\n"
                    "Jeżeli nie prosiłeś o zmianę hasła, "
                    "zignoruj tę wiadomość."
                ),
                from_email=None,
                recipient_list=[user.email],
                fail_silently=False,
            )

        return Response(
            {
                "detail": (
                    "Jeżeli konto z podanym adresem e-mail "
                    "istnieje, wysłaliśmy instrukcję "
                    "resetowania hasła."
                )
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]

        try:
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id)
        except (
            TypeError,
            ValueError,
            OverflowError,
            User.DoesNotExist,
        ):
            return Response(
                {
                    "detail": "Nieprawidłowy link resetowania hasła."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(
            user,
            token
        ):
            return Response(
                {
                    "detail": (
                        "Link resetowania hasła jest "
                        "nieprawidłowy lub wygasł."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(
            serializer.validated_data["new_password"]
        )

        user.save(
            update_fields=["password"]
        )

        return Response(
            {
                "detail": "Hasło zostało ustawione."
            },
            status=status.HTTP_200_OK,
        )