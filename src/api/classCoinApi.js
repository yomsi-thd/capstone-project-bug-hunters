import api from "./axios";

export const getBalance = async () => {
  const response = await api.get("/classcoin/balance");

  return response.data;
};

export const getTransactions = async () => {
  const response = await api.get("/classcoin/transactions");

  return response.data;
};