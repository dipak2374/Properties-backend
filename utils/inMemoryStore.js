const crypto = require('crypto');

const store = global.__propertyhubInMemoryStore || (global.__propertyhubInMemoryStore = {});

const getCollection = (key) => {
  if (!store[key]) {
    store[key] = [];
  }
  return store[key];
};

const createId = () => crypto.randomUUID();

const addEntry = (key, payload) => {
  const collection = getCollection(key);
  const entry = {
    _id: payload._id || createId(),
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: payload.updatedAt || new Date().toISOString(),
    ...payload,
  };

  collection.unshift(entry);
  return entry;
};

const listEntries = (key) => getCollection(key).slice();

module.exports = { addEntry, listEntries };
