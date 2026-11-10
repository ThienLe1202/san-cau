# Sân Cầu

Static badminton team manager PWA. The app keeps its team, attendance, and finance data in the browser on the device. No team names or opening balance are embedded in this repository.

## GitHub Pages

Push this repository to a GitHub repository on the `main` branch, then in **Settings → Pages** choose **GitHub Actions** as the build and deployment source. The workflow in `.github/workflows/pages.yml` publishes the site on each push.

Open the resulting HTTPS URL in Safari on iPhone, choose **Share → Add to Home Screen**, and turn on **Open as Web App**. Load the app once while online so its files can be cached for offline use.

App data is stored locally in Safari on that iPhone. Clearing Safari website data or changing devices removes access to that data; this MVP has no export or sync feature.

## Court payments

Session court prices track costs only. They do not reduce the cash balance or count as paid expenses. Record the actual monthly court payment once under Ghi khoản chi → Tiền sân, using its payment date. Existing manually recorded expenses remain unchanged.

The finance view also shows a court cost estimate for the selected month, including past and upcoming scheduled sessions, even if passed to another team. It sums each session’s hourly rate × duration, preserving stored costs for older sessions without an hourly rate. This estimate never changes the cash balance.

October 2026 uses the full Tuesday/Thursday booking schedule: 9 bookings × 2 hours × 75,000 VND/hour = 1,350,000 VND, regardless of attendance or passing the court. The estimate appears below the cash balance with secondary styling.
