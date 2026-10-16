# Sân Cầu

Static badminton team manager PWA. The app keeps its team, attendance, and finance data in the browser on the device. No team names or opening balance are embedded in this repository.

## GitHub Pages

Push this repository to a GitHub repository on the `main` branch, then in **Settings → Pages** choose **GitHub Actions** as the build and deployment source. The workflow in `.github/workflows/pages.yml` publishes the site on each push.

Open the resulting HTTPS URL in Safari on iPhone, choose **Share → Add to Home Screen**, and turn on **Open as Web App**. Load the app once while online so its files can be cached for offline use.

App data is stored locally in Safari on that iPhone. Clearing Safari website data or changing devices removes access to that data; this MVP has no export or sync feature.

## Court payments

Session court prices track costs only. They do not reduce the cash balance or count as paid expenses. Record the actual monthly court payment once under Ghi khoản chi → Tiền sân, using its payment date. Existing manually recorded expenses remain unchanged.
