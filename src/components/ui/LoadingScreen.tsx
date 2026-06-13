import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";

const splashMark = require("../../../assets/images/splash-icon.png");

export default function LoadingScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const dotA = useRef(new Animated.Value(0.35)).current;
  const dotB = useRef(new Animated.Value(0.35)).current;
  const dotC = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const progressLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );

    const dotLoop = Animated.loop(
      Animated.stagger(
        180,
        [dotA, dotB, dotC].map((dot) =>
          Animated.sequence([
            Animated.timing(dot, {
              toValue: 1,
              duration: 360,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(dot, {
              toValue: 0.35,
              duration: 520,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    );

    pulseLoop.start();
    progressLoop.start();
    dotLoop.start();

    return () => {
      pulseLoop.stop();
      progressLoop.stop();
      dotLoop.stop();
    };
  }, [dotA, dotB, dotC, progress, pulse]);

  const logoScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.04],
  });
  const glowScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const glowOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.34],
  });
  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["18%", "100%"],
  });

  return (
    <View style={styles.screen}>
      <View style={styles.centerStage}>
        <Animated.View
          style={{
            ...styles.glow,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />
        <Animated.View style={{ transform: [{ scale: logoScale }] }}>
          <Image
            source={splashMark}
            resizeMode="contain"
            style={styles.mark}
          />
        </Animated.View>

        <Text style={styles.title}>
          MEALTRACK PRO
        </Text>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.tagline}>
          PRECISION INVENTORY. PROFESSIONAL FINANCE.
        </Text>
        <View style={styles.dots}>
          {[dotA, dotB, dotC].map((dot, index) => (
            <Animated.View
              key={index}
              style={[styles.dot, { opacity: dot }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#066B35",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingTop: 96,
    paddingBottom: 72,
  },
  centerStage: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#24C86D",
  },
  mark: {
    width: 242,
    height: 242,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginTop: 16,
    letterSpacing: 0,
    textAlign: "center",
  },
  progressTrack: {
    width: 100,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255,255,255,0.15)",
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3.5,
    backgroundColor: "#35D883",
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  tagline: {
    color: "#B6D5C5",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 3.2,
    lineHeight: 26,
    textAlign: "center",
  },
  dots: {
    flexDirection: "row",
    gap: 16,
    marginTop: 34,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#B6D5C5",
  },
});
