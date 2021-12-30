import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExist = cart.find(product => product.id === productId);
      const currentAmount = productExist?.amount ?? 0;
      const updatedAmount = currentAmount + 1;

      const { data: stock } = await api.get(`/stock/${productId}`);

      if (updatedAmount > stock.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      let updatedCart: Product[] = []

      if (productExist) {
        updatedCart = cart.map(product => product.id === productId ? {
          ...product,
          amount: updatedAmount
        }
          : product
        )

        setCart(updatedCart);

      } else {
        const product = await api.get(`/products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1,
        }

        updatedCart = [...cart, newProduct]
        setCart(updatedCart);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExist = cart.find(product => product.id === productId);

      if (!productExist) {
        throw Error();
      }

      const updatedCart = cart.filter(product => product.id !== productId)
      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

    } catch {
      toast.error('Erro na remoção do produto')
    }

    
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw Error();
      }

      const { data: stock } = await api.get(`/stock/${productId}`);

      if (stock.amount <= amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = cart.map(product => product.id === productId ? {
        ...product,
        amount,
      }
        : product
      )

      setCart(updatedCart)
      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(updatedCart))

    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
