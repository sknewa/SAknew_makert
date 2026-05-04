import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

const CardPaymentScreen: React.FC = () => {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.replace('AddFundsScreen' as never);
  }, []);
  return null;
};

export default CardPaymentScreen;
