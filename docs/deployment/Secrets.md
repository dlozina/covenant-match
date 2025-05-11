# Create secrets

Example:

# Create directories for secrets
mkdir -p dev-secrets

# Create development secrets from .env files
echo "mongodb://mongodb:xxxx/xxxx" > dev-secrets/mongodb_uri.txt
echo "xxxx" > dev-secrets/jwt_secret.txt
echo "xxxx" > dev-secrets/recaptcha_secret_key.txt