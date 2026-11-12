import type { Catalog } from "./types";

/** Same rows as salesforce/data (the seed data). */
export const FIXTURE_CATALOG: Catalog = {
  offerings: [
    {
      slug: "ask-sfcc-question",
      name: "Ask an SFCC developer",
      description:
        "Type your SFCC question (SFRA, SCAPI, PWA Kit, Business Manager, jobs, integrations). Piyush replies by email.",
      pointsPrice: 100,
      fulfilmentType: "Question",
      deliveryPromise: "Reply by email within 48 hours",
      bookingUrl: null,
    },
    {
      slug: "resume-review",
      name: "Resume review for Salesforce / SFCC developers",
      description:
        "Upload your resume as a PDF and get it back with comments on what to cut, sharpen and add for Salesforce and SFCC roles.",
      pointsPrice: 250,
      fulfilmentType: "Resume",
      deliveryPromise: "Annotated review within 3 days",
      bookingUrl: null,
    },
    {
      slug: "career-chat",
      name: "20-minute career chat",
      description:
        "A relaxed video call about SFCC careers, switching projects or getting started. Book a slot that suits you.",
      pointsPrice: 300,
      fulfilmentType: "Booking",
      deliveryPromise: "Video link sent when you book",
      bookingUrl: "https://cal.com/your-handle/career-chat",
    },
    {
      slug: "mock-interview",
      name: "Mock SFCC interview (45 min)",
      description:
        "A practice interview with SFCC technical questions, followed by written feedback on what went well and what to work on.",
      pointsPrice: 500,
      fulfilmentType: "Booking",
      deliveryPromise: "Call plus written feedback",
      bookingUrl: "https://cal.com/your-handle/mock-interview",
    },
  ],
  tasks: [
    { key: "signup", name: "Sign up with email", description: "Confirm your email with the magic link.", points: 50, verification: "System", maxPerWallet: 1, linkUrl: null },
    { key: "explore", name: "Explore the site", description: "Visit 3 pages, including How it's built.", points: 30, verification: "Honour", maxPerWallet: 1, linkUrl: null },
    { key: "feedback", name: "Give feedback on the site", description: "Tell Piyush what works and what doesn't.", points: 50, verification: "Form", maxPerWallet: 1, linkUrl: null },
    { key: "email-piyush", name: "Send Piyush an email", description: "Say hello or ask something, sent through the site.", points: 40, verification: "Form", maxPerWallet: 1, linkUrl: null },
    { key: "linkedin-post", name: "Read and react to a LinkedIn post", description: "Honour system: open one of Piyush's posts and react if you like it.", points: 20, verification: "Honour", maxPerWallet: 1, linkUrl: "https://www.linkedin.com/in/your-handle/recent-activity/all/" },
    { key: "linkedin-hi", name: "Say hi on LinkedIn", description: "Honour system: connect or send a short hello.", points: 20, verification: "Honour", maxPerWallet: 1, linkUrl: "https://www.linkedin.com/in/your-handle/" },
    { key: "referral", name: "Refer a friend who signs up", description: "Share your referral link; you earn when a friend signs up with it.", points: 100, verification: "Referral", maxPerWallet: 5, linkUrl: null },
    { key: "review", name: "Review a delivered order", description: "Rate and review an offering after it is delivered.", points: 75, verification: "Review", maxPerWallet: 10, linkUrl: null },
  ],
};
