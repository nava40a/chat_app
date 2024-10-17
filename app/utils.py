import bcrypt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароля."""

    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )
