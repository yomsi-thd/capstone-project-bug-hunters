import api from "./axios";

// The backend serves the balance at GET /classcoins, not /classcoins/balance.
export const getBalance = async () => {
  const response = await api.get("/classcoins");

  return response.data;
};

// My Investments: one row per project, already joined to it. Replaced the page's old
// "read every transaction, then GET /projects/:id for each" loop on 2026-08-18.
export const getMyInvestments = async () => {
  const response = await api.get("/classcoins/investments");

  // The API answers list endpoints with { items, total, limit, offset }. The envelope
  // is unwrapped HERE so pages and mappers keep the plain array they were built
  // against - eleven lines in this folder instead of a change in every page.
  return response.data.items;
};

// Grant Class Coins to one or many accounts. Bulk and single are the same call — granting
// to one person is a list of one — and the server runs the whole list in ONE transaction,
// so "half of them got it" is not a state this can produce.
export const grantCoins = async (userIds, amount) => {
  const response = await api.post("/classcoins/grant", { user_ids: userIds, amount });
  return response.data;
};

export const getTransactions = async () => {
  const response = await api.get("/classcoins/transactions");

  return response.data.items;
};
// A7 — somebody outside RMIT asking for Class Coins. `note` is required; the length rule
// lives in components/classcoin/coinRequestRules.js and the backend enforces it too (422).
export const requestCoins = async (note) => {
  const response = await api.post("/classcoins/requests", { note });
  return response.data;
};

// The signed-in user's waiting request, or null when there is none. 200 with a null body
// is the ordinary answer here — do not read it as an error.
export const getMyCoinRequest = async () => {
  const response = await api.get("/classcoins/requests/me");
  return response.data;
};
