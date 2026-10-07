-- Allow invited users before Cognito account exists
ALTER TABLE "users" ALTER COLUMN "cognito_sub" DROP NOT NULL;
