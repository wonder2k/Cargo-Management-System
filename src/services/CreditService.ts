import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer, Invoice } from '../types';

export const CreditService = {
  calculateOutstandingBalance: async (customerId: string): Promise<number> => {
    // Sum all unpaid or partially paid invoices for this customer
    const q = query(
      collection(db, 'invoices'),
      where('customerId', '==', customerId)
    );
    const snap = await getDocs(q);
    const invoices = snap.docs.map(d => d.data() as Invoice);
    
    return invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  },

  getAllCustomerBalances: async (): Promise<Record<string, number>> => {
    const snap = await getDocs(collection(db, 'invoices'));
    const balances: Record<string, number> = {};
    
    snap.docs.forEach(d => {
      const inv = d.data() as Invoice;
      if (inv.status !== 'paid') {
        balances[inv.customerId] = (balances[inv.customerId] || 0) + (inv.amount || 0);
      }
    });
    
    return balances;
  }
};
