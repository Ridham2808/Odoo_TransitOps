// lib/mail.js
// Nodemailer service using Brevo SMTP relay
// All sends are fire-and-forget (non-blocking) via async queuing

import nodemailer from "nodemailer";

/** Singleton transporter */
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS on port 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

/**
 * Send an email (fire-and-forget — never throws, just logs on failure).
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
export async function sendMail({ to, subject, html, text }) {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? "TransitOps <noreply@transitops.app>",
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ""),
    });
  } catch (err) {
    // Non-blocking — log but never crash the request
    console.error("[mail] Failed to send email:", err?.message);
  }
}

// ── Email templates ───────────────────────────────────────────────────────

/**
 * Trip dispatched notification.
 */
export async function sendTripDispatchedEmail({ adminEmail, trip, vehicle, driver }) {
  const subject = `🚛 Trip ${trip.tripCode} Dispatched`;
  const html = `
    <div style="font-family:Inter,sans-serif;background:#0A0A0B;color:#F1F0EE;padding:32px;border-radius:8px;max-width:560px;margin:0 auto;">
      <div style="margin-bottom:24px;">
        <span style="font-size:20px;font-weight:700;letter-spacing:-0.01em;">TransitOps</span>
        <span style="font-size:11px;color:#8B8A87;margin-left:8px;text-transform:uppercase;letter-spacing:0.05em;">Fleet Operations</span>
      </div>
      <div style="background:#111113;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:24px;margin-bottom:16px;">
        <div style="font-size:13px;color:#8B8A87;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Trip Dispatched</div>
        <div style="font-size:22px;font-weight:700;color:#F59E0B;">${trip.tripCode}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:8px 0;color:#8B8A87;width:140px;">Route</td><td style="color:#F1F0EE;">${trip.source} → ${trip.destination}</td></tr>
        <tr><td style="padding:8px 0;color:#8B8A87;">Vehicle</td><td style="color:#F1F0EE;">${vehicle.name} (${vehicle.registrationNo})</td></tr>
        <tr><td style="padding:8px 0;color:#8B8A87;">Driver</td><td style="color:#F1F0EE;">${driver.name}</td></tr>
        <tr><td style="padding:8px 0;color:#8B8A87;">Cargo Weight</td><td style="color:#F1F0EE;">${trip.cargoWeight} kg</td></tr>
        <tr><td style="padding:8px 0;color:#8B8A87;">Planned Distance</td><td style="color:#F1F0EE;">${trip.plannedDistance} km</td></tr>
        <tr><td style="padding:8px 0;color:#8B8A87;">Dispatched At</td><td style="color:#F1F0EE;">${new Date().toLocaleString("en-IN")}</td></tr>
      </table>
      <div style="margin-top:24px;font-size:11px;color:#555450;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
        This is an automated message from TransitOps. Do not reply to this email.
      </div>
    </div>
  `;

  await sendMail({ to: adminEmail, subject, html });
}

/**
 * Trip completed notification.
 */
export async function sendTripCompletedEmail({ adminEmail, trip }) {
  const subject = `✅ Trip ${trip.tripCode} Completed`;
  const html = `
    <div style="font-family:Inter,sans-serif;background:#0A0A0B;color:#F1F0EE;padding:32px;border-radius:8px;max-width:560px;margin:0 auto;">
      <div style="margin-bottom:24px;">
        <span style="font-size:20px;font-weight:700;">TransitOps</span>
      </div>
      <div style="background:#111113;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:24px;margin-bottom:16px;">
        <div style="font-size:13px;color:#8B8A87;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Trip Completed</div>
        <div style="font-size:22px;font-weight:700;color:#22C55E;">${trip.tripCode}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:8px 0;color:#8B8A87;width:140px;">Route</td><td style="color:#F1F0EE;">${trip.source} → ${trip.destination}</td></tr>
        <tr><td style="padding:8px 0;color:#8B8A87;">Completed At</td><td style="color:#F1F0EE;">${new Date().toLocaleString("en-IN")}</td></tr>
      </table>
      <div style="margin-top:24px;font-size:11px;color:#555450;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
        Automated message from TransitOps.
      </div>
    </div>
  `;

  await sendMail({ to: adminEmail, subject, html });
}

/**
 * License expiry warning.
 */
export async function sendLicenseExpiryEmail({ adminEmail, driver, daysUntilExpiry }) {
  const subject = `⚠️ Driver License Expiring Soon — ${driver.name}`;
  const html = `
    <div style="font-family:Inter,sans-serif;background:#0A0A0B;color:#F1F0EE;padding:32px;border-radius:8px;max-width:560px;margin:0 auto;">
      <div style="margin-bottom:24px;">
        <span style="font-size:20px;font-weight:700;">TransitOps</span>
      </div>
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:24px;margin-bottom:16px;">
        <div style="font-size:13px;color:#F59E0B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">License Expiry Warning</div>
        <div style="font-size:18px;font-weight:600;color:#F1F0EE;">${driver.name}</div>
      </div>
      <p style="font-size:13px;color:#8B8A87;">
        Driver <strong style="color:#F1F0EE;">${driver.name}</strong>'s license 
        (<strong style="color:#F1F0EE;">${driver.licenseNumber}</strong>) 
        expires in <strong style="color:#F59E0B;">${daysUntilExpiry} days</strong>. 
        Please renew it before it expires to avoid dispatch restrictions.
      </p>
      <div style="margin-top:24px;font-size:11px;color:#555450;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
        Automated message from TransitOps.
      </div>
    </div>
  `;

  await sendMail({ to: adminEmail, subject, html });
}

/**
 * License expiry summary notification.
 */
export async function sendLicenseExpirySummaryEmail({ adminEmail, expiringDrivers }) {
  const subject = `⚠️ Action Required: License Expiry Alert Summary`;
  
  const rowsHtml = expiringDrivers.map((driver) => {
    const isExpired = new Date(driver.licenseExpiry) < new Date();
    const statusText = isExpired ? '<span style="color:#EF4444;font-weight:600;">EXPIRED</span>' : 'Expiring Soon';
    const expiryStr = new Date(driver.licenseExpiry).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="padding:10px 8px;color:#F1F0EE;font-weight:600;">${driver.name}</td>
        <td style="padding:10px 8px;color:#8B8A87;">${driver.licenseNumber}</td>
        <td style="padding:10px 8px;color:#8B8A87;">${driver.licenseCategory}</td>
        <td style="padding:10px 8px;color:#F1F0EE;">${expiryStr}</td>
        <td style="padding:10px 8px;text-align:right;">${statusText}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <div style="font-family:Inter,sans-serif;background:#0A0A0B;color:#F1F0EE;padding:32px;border-radius:8px;max-width:640px;margin:0 auto;">
      <div style="margin-bottom:24px;">
        <span style="font-size:20px;font-weight:700;letter-spacing:-0.01em;">TransitOps</span>
        <span style="font-size:11px;color:#8B8A87;margin-left:8px;text-transform:uppercase;letter-spacing:0.05em;">Compliance Alerts</span>
      </div>
      
      <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="font-size:13px;color:#F59E0B;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Action Required</div>
        <div style="font-size:18px;font-weight:600;color:#F1F0EE;">License Expiry Alerts Summary</div>
        <p style="font-size:13px;color:#8B8A87;margin:8px 0 0 0;">
          The following drivers have licenses that have expired or are expiring within the next 30 days.
        </p>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px;text-align:left;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.1);color:#8B8A87;font-weight:600;">
            <th style="padding:8px;">Driver</th>
            <th style="padding:8px;">License No.</th>
            <th style="padding:8px;">Category</th>
            <th style="padding:8px;">Expiry Date</th>
            <th style="padding:8px;text-align:right;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="margin-top:32px;font-size:11px;color:#555450;border-top:1px solid rgba(255,255,255,0.06);padding-top:16px;">
        Automated message from TransitOps. Please check the drivers registry page to update records.
      </div>
    </div>
  `;

  await sendMail({ to: adminEmail, subject, html });
}

