# Deploy to Render

This project is configured for a single Render web service. Express serves both the API and the React production build.

## Steps

1. Push these latest changes to GitHub.
2. In Render, choose **New +** then **Blueprint**.
3. Connect this GitHub repository.
4. Render will read `render.yaml` and create:
   - `medical-certificate-system` web service
   - `medical-certificates-db` PostgreSQL database
5. Confirm the generated resources and deploy.

## After Deploy

Open the web service URL and check:

```text
https://your-service.onrender.com/api/health
```

The app itself should load at:

```text
https://your-service.onrender.com
```

## Optional Environment Variables

Set these only if you want SMS or Gmail sending in production:

```text
MOJAWAVE_ENABLED=true
MOJAWAVE_API_KEY=...
MOJAWAVE_SENDER_ID=...

BEEM_ENABLED=true
BEEM_API_KEY=...
BEEM_SECRET_KEY=...
BEEM_SENDER_ID=...

GMAIL_ENABLED=true
GMAIL_EMAIL=...
GMAIL_APP_PASSWORD=...
GMAIL_SENDER_NAME=AFYA - Bariadi District
```

If any real `.env` file was pushed to GitHub before `.gitignore` was added, rotate those secrets and remove the file from the repository history or at least from the latest commit.
