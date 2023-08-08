import React from 'react';
import PawnUtility from './PawnUtility';
import SocialMediaIntegration from './SocialMediaIntegration';
import {SafeAreaView, StyleSheet, Text} from 'react-native';
const App = () => {
return (
  <SafeAreaView style={styles.container}>
    <PawnUtility />
    <SocialMediaIntegration />
<Text>Welcome to Secure Digital Pawn Integration App</Text>
  </SafeAreaView>
);
};

const styles = StyleSheet.create({
container: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},
});

export default App;


