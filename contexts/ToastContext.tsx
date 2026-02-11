import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error") => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastAnimation = useRef(new Animated.Value(0)).current;

  const showToast = useCallback(
    (message: string, type: "success" | "error" = "success") => {
      // Stop any ongoing animation and reset
      toastAnimation.stopAnimation();
      toastAnimation.setValue(0);

      setToastMessage(message);
      setToastType(type);
      setToastVisible(true);

      Animated.sequence([
        Animated.timing(toastAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
        Animated.timing(toastAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastVisible(false);
      });
    },
    [toastAnimation],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={{ flex: 1 }}>
        {children}

        {/* Global Toast Notification */}
        {toastVisible && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 100,
              left: 20,
              right: 20,
              backgroundColor:
                toastType === "success" ? "#10B981" : "#EF4444",
              borderRadius: 12,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
              zIndex: 9999,
              transform: [
                {
                  translateY: toastAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
              opacity: toastAnimation,
            }}
          >
            <Ionicons
              name={
                toastType === "success" ? "checkmark-circle" : "alert-circle"
              }
              size={24}
              color="white"
            />
            <Text className="text-white text-base font-sora-semibold ml-3 flex-1">
              {toastMessage}
            </Text>
          </Animated.View>
        )}
      </View>
    </ToastContext.Provider>
  );
};
