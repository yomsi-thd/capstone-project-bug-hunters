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

export const getTransactions = async () => {
  const response = await api.get("/classcoins/transactions");

  return response.data.items;
};