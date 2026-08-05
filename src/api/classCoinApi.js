import api from "./axios";

// The backend serves the balance at GET /classcoins, not /classcoins/balance.
export const getBalance = async () => {
  const response = await api.get("/classcoins");

  return response.data;
};

export const getTransactions = async () => {
  const response = await api.get("/classcoins/transactions");

  return response.data;
};