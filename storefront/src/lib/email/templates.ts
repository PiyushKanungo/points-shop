import type { FulfilmentType, Order } from "../backend/types";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#2b2622;background:#faf7f2;padding:24px">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;border:1px solid #ece4d8">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${bodyHtml}
<p style="color:#8a7f73;font-size:12px;margin-top:28px">Piyush's Points Shop is a personal portfolio project. You're getting this because someone (hopefully you) used this email on the shop.</p>
</div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(label)}</a></p>`;
}

export function nextStepFor(type: FulfilmentType): string {
  switch (type) {
    case "Question":
      return "Type your question on the order page. Piyush replies by email.";
    case "Resume":
      return "Upload your resume (PDF) on the order page.";
    case "Booking":
      return "Pick a time slot from the order page.";
  }
}

export function magicLinkEmail(link: string): EmailContent {
  return {
    subject: "Your sign-in link for Piyush's Points Shop",
    html: layout(
      "Sign in to Piyush's Points Shop",
      `<p>Tap the button and then press <strong>Sign in</strong>. The link works once and expires in 15 minutes.</p>${button(link, "Open sign-in page")}<p style="font-size:13px;color:#6b6157">Didn't ask for this? You can ignore this email.</p>`,
    ),
    text: `Sign in to Piyush's Points Shop\n\nOpen this link, then press Sign in. It works once and expires in 15 minutes:\n${link}\n\nDidn't ask for this? Ignore this email.`,
  };
}

export function welcomeEmail(siteUrl: string, balance: number): EmailContent {
  return {
    subject: "Welcome to Piyush's Points Shop: 50 points to start",
    html: layout(
      "You're in. Here are 50 points.",
      `<p>Your balance is <strong>${balance} points</strong>. A few small things earn more: explore the site, leave feedback, say hi on LinkedIn.</p>${button(`${siteUrl}/#earn`, "See ways to earn")}<p>When you have enough, spend them on a real SFCC question, a resume review, a chat or a mock interview.</p>`,
    ),
    text: `You're in. Here are 50 points.\n\nYour balance is ${balance} points. See ways to earn: ${siteUrl}/#earn`,
  };
}

export function orderConfirmedEmail(siteUrl: string, orders: Order[], balance: number): EmailContent {
  const rows = orders
    .map(
      (o) =>
        `<li style="margin-bottom:12px"><strong>${escapeHtml(o.orderNumber)}: ${escapeHtml(o.offering.name)}</strong> (${o.pointsSpent} points)<br>${escapeHtml(nextStepFor(o.offering.fulfilmentType))}<br><a href="${escapeHtml(`${siteUrl}/orders/${encodeURIComponent(o.id)}`)}">Open the order</a></li>`,
    )
    .join("");
  const textRows = orders
    .map(
      (o) =>
        `- ${o.orderNumber}: ${o.offering.name} (${o.pointsSpent} points)\n  ${nextStepFor(o.offering.fulfilmentType)}\n  ${siteUrl}/orders/${encodeURIComponent(o.id)}`,
    )
    .join("\n");
  return {
    subject: orders.length === 1 ? `Order ${orders[0].orderNumber} confirmed` : `${orders.length} orders confirmed`,
    html: layout("Thanks, your order is in", `<ul style="padding-left:18px">${rows}</ul><p>Points left: <strong>${balance}</strong>.</p>`),
    text: `Thanks, your order is in.\n\n${textRows}\n\nPoints left: ${balance}.`,
  };
}

export function ownerOrderAlert(siteUrl: string, email: string, orders: Order[]): EmailContent {
  const list = orders.map((o) => `${o.orderNumber}: ${o.offering.name}`).join(", ");
  return {
    subject: `New order from ${email}: ${list}`,
    html: layout(
      "New order",
      `<p>${escapeHtml(email)} ordered: ${escapeHtml(list)}.</p><p>Open the Points Shop app in Salesforce (Open Orders) to fulfil it.</p><p style="font-size:13px">${escapeHtml(siteUrl)}</p>`,
    ),
    text: `${email} ordered: ${list}.\nOpen the Points Shop app in Salesforce (Open Orders).`,
  };
}

export function orderStatusEmail(siteUrl: string, order: Order): EmailContent {
  const link = `${siteUrl}/orders/${encodeURIComponent(order.id)}`;
  const what = `${order.orderNumber}: ${order.offering.name}`;
  if (order.status === "Delivered") {
    return {
      subject: `Delivered: ${what}`,
      html: layout("Your order is delivered", `<p><strong>${escapeHtml(what)}</strong></p><p>If it helped, a short review earns you 75 points.</p>${button(link, "Review the order")}`),
      text: `Your order is delivered.\n\n${what}\n\nA short review earns you 75 points: ${link}`,
    };
  }
  return {
    subject: `Cancelled: ${what} (points returned)`,
    html: layout("Your order was cancelled", `<p><strong>${escapeHtml(what)}</strong></p><p>Its ${order.pointsSpent} points are back in your balance.</p>${button(`${siteUrl}/account`, "See your balance")}`),
    text: `Your order was cancelled.\n\n${what}\n\nIts ${order.pointsSpent} points are back in your balance: ${siteUrl}/account`,
  };
}

export function ownerDetailsAlert(email: string, order: Order, detail: string): EmailContent {
  return {
    subject: `${order.orderNumber} is ready to fulfil`,
    html: layout("Order ready to fulfil", `<p>${escapeHtml(order.orderNumber)}: ${escapeHtml(order.offering.name)} for ${escapeHtml(email)}.</p><p>${escapeHtml(detail)}</p>`),
    text: `${order.orderNumber}: ${order.offering.name} for ${email}.\n${detail}`,
  };
}

export function visitorMessageEmail(kind: "feedback" | "contact", from: string, message: string): EmailContent {
  const label = kind === "feedback" ? "Site feedback" : "Message";
  return {
    subject: `${label} from ${from}`,
    html: layout(label, `<p><strong>From:</strong> ${escapeHtml(from)}</p><p style="white-space:pre-wrap">${escapeHtml(message)}</p>`),
    text: `${label} from ${from}\n\n${message}`,
  };
}
