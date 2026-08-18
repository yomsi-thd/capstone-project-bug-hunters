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

  return response.data;
};

export const getTransactions = async () => {
  const response = await api.get("/classcoins/transactions");

  return response.data;
};