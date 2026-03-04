import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const ProductDetailsScreen = () => (
  <View style={styles.container}>
    <Text style={styles.text}>Product Details Screen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ProductDetailsScreen;
