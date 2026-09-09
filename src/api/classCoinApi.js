import api from "./axios";

// The backend serves the balance at GET /classcoins, not /classcoins/balance.
export const getBalance = async () => {
  const response = await api.get("/classcoins");

  return response.data;
};

// My Investments: one row per project, already joined, so the page needs no follow-up
// request per investment.
export const getMyInvestments = async () => {
  const response = await api.get("/classcoins/investments");

  // List endpoints answer { items, total, limit, offset }. Unwrapped here so pages and
  // mappers keep the plain array they were written against.
  return response.data.items;
};

// Grants to one or many accounts; a single grant is a list of one. The server runs the
// whole list in one transaction, so it cannot half-succeed.
export const grantCoins = async (userIds, amount) => {
  const response = await api.post("/classcoins/grant", { user_ids: userIds, amount });
  return response.data;
};

export const getTransactions = async () => {
  const response = await api.get("/classcoins/transactions");

  return response.data.items;
};
// Asks an admin for Class Coins. `note` is required; its length rule lives in
// components/classcoin/coinRequestRules.js, and the backend enforces it too.
export const requestCoins = async (note) => {
  const response = await api.post("/classcoins/requests", { note });
  return response.data;
};

// The signed-in user's waiting request, or null when there is none. A null body is the
// normal answer here, not an error.
export const getMyCoinRequest = async () => {
  const response = await api.get("/classcoins/requests/me");
  return response.data;
};
