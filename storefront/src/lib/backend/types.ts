/** Types transcribing the Apex REST contract (design section 4). */

export type FulfilmentType = "Question" | "Resume" | "Booking";
export type Verification = "System" | "Form" | "Honour" | "Referral" | "Review";
export type OrderStatus = "Awaiting Details" | "In Progress" | "Delivered" | "Cancelled";

export interface Offering {
  slug: string;
  name: string;
  description: string | null;
  pointsPrice: number;
  fulfilmentType: FulfilmentType;
  deliveryPromise: string | null;
  bookingUrl: string | null;
}

export interface Task {
  key: string;
  name: string;
  description: string | null;
  points: number;
  verification: Verification;
  maxPerWallet: number;
  linkUrl: string | null;
}

export interface Catalog {
  offerings: Offering[];
  tasks: Task[];
}

export interface LedgerEntry {
  id: string;
  amount: number;
  entryType: "Earn" | "Redeem" | "Refund" | "Adjustment";
  reason: string | null;
  createdAt: string;
}

export interface Wallet {
  id: string;
  email: string;
  balance: number;
  referralCode: string;
  recentEntries: LedgerEntry[];
  taskCounts: Record<string, number>;
}

export interface Order {
  id: string;
  orderNumber: string;
  offering: { slug: string; name: string; fulfilmentType: FulfilmentType };
  status: OrderStatus;
  pointsSpent: number;
  question: string | null;
  resumeUrl: string | null;
  bookingStart: string | null;
  createdAt: string;
  deliveredAt: string | null;
  cancelledAt: string | null;
  review: { rating: number; text: string | null } | null;
}

export interface VerifyResult {
  wallet: Wallet;
  isNew: boolean;
}

export interface TaskResult {
  pointsAwarded: number;
  replay: boolean;
  balance: number;
}

export interface CheckoutResult {
  orders: Order[];
  replay: boolean;
  balance: number;
}

export type OrderDetails = { question: string } | { resumeUrl: string };

export interface ReviewResult {
  order: Order;
  pointsAwarded: number;
  replay: boolean;
  balance: number;
}

export interface ChatReply {
  reply: string;
  sessionId: string;
}

export interface ShopBackend {
  /** Counts one attempt for the key; false when the window's limit is used up. */
  allow(key: string, max: number, windowMinutes: number): Promise<boolean>;
  /** The delivered or cancelled email that is due for the order, once; null when none is. */
  claimNotice(orderId: string): Promise<{ email: string; order: Order } | null>;
  releaseNotice(orderId: string): Promise<void>;
  saveResume(walletId: string, orderId: string, pdfBase64: string): Promise<Order>;
  startChat(walletId: string): Promise<string>;
  sendChat(walletId: string, chatKey: string, text: string, sessionId?: string): Promise<ChatReply>;
  /** Sends through Salesforce; `to` null means the shop's owner. */
  sendEmail(to: string | null, subject: string, html: string): Promise<void>;
  saveDetails(walletId: string, orderId: string, details: OrderDetails): Promise<Order>;
  saveBooking(walletId: string, orderId: string, bookingUid: string, bookingStart: string): Promise<Order>;
  submitReview(walletId: string, orderId: string, rating: number, text?: string): Promise<ReviewResult>;
  getCatalog(): Promise<Catalog>;
  verifySignIn(email: string, issuedAt: number, referralCode?: string): Promise<VerifyResult>;
  getWallet(walletId: string): Promise<Wallet>;
  completeTask(walletId: string, taskKey: string, evidence?: string): Promise<TaskResult>;
  checkout(walletId: string, checkoutKey: string, slugs: string[]): Promise<CheckoutResult>;
  listOrders(walletId: string): Promise<Order[]>;
  getOrder(walletId: string, orderId: string): Promise<Order>;
}
