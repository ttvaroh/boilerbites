import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View } from 'react-native';

interface BackgroundTemplateProps {
  children: React.ReactNode;
  paddingBottom?: number;
}

const BackgroundTemplate = ({ children, paddingBottom = 0 }: BackgroundTemplateProps) => {
  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#0d0d0d']}
        locations={[0, 0.5, 1]}
        style={{ flex: 1, paddingBottom }}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

export default BackgroundTemplate;