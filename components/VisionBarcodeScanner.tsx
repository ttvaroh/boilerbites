import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    Camera,
    useCameraDevice,
    useCodeScanner,
} from "react-native-vision-camera";
import BackgroundTemplate from "./BackgroundTemplate";

interface VisionBarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
}

const VisionBarcodeScanner: React.FC<VisionBarcodeScannerProps> = ({
  visible,
  onClose,
  onBarcodeScanned,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastScannedBarcode = useRef<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const device = useCameraDevice("back");

  // Check and request camera permissions
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const status = await Camera.getCameraPermissionStatus();
        if (status === "granted") {
          setHasPermission(true);
          setIsInitializing(false);
        } else if (status === "not-determined") {
          const newStatus = await Camera.requestCameraPermission();
          setHasPermission(newStatus === "granted");
          setIsInitializing(false);
        } else {
          setHasPermission(false);
          setIsInitializing(false);
        }
      } catch (err) {
        console.error("Error checking camera permission:", err);
        setError("Failed to check camera permissions");
        setHasPermission(false);
        setIsInitializing(false);
      }
    };

    if (visible) {
      checkPermission();
    } else {
      // Reset state when modal closes
      setError(null);
      lastScannedBarcode.current = null;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    }
  }, [visible]);

  // Code scanner for barcode detection
  const codeScanner = useCodeScanner({
    codeTypes: ['ean-13', 'upc-a', 'code-128', 'qr'],
    onCodeScanned: (codes) => {
      if (codes.length > 0) {
        const barcode = codes[0];
        const barcodeValue = barcode.value || "";

        // Debounce: prevent duplicate scans
        if (
          barcodeValue &&
          barcodeValue !== lastScannedBarcode.current &&
          barcodeValue.length > 0
        ) {
          lastScannedBarcode.current = barcodeValue;

          // Clear any existing timeout
          if (scanTimeoutRef.current) {
            clearTimeout(scanTimeoutRef.current);
          }

          // Set timeout to allow for barcode validation
          scanTimeoutRef.current = setTimeout(() => {
            // Validate barcode format (strip whitespace)
            const cleanedBarcode = barcodeValue.trim();
            if (cleanedBarcode.length > 0) {
              // Trigger haptic feedback if available
              // React Native doesn't have built-in haptic, but we can add visual feedback
              onBarcodeScanned(cleanedBarcode);
            }
          }, 300);
        }
      }
    },
  });

  const openSettings = () => {
    Linking.openSettings();
  };

  const toggleTorch = () => {
    if (device?.hasTorch) {
      setTorchEnabled((prev) => !prev);
    }
  };

  // Show permission denied UI
  if (hasPermission === false) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <BackgroundTemplate>
          <View className="flex-1 justify-center items-center px-6">
            <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
            <Text className="text-white text-xl font-sora-bold mt-6 mb-2 text-center">
              Camera Permission Required
            </Text>
            <Text className="text-gray-400 text-base font-sora text-center mb-8">
              We need camera access to scan barcodes. Please enable camera
              permissions in your device settings.
            </Text>
            <TouchableOpacity
              onPress={openSettings}
              className="bg-purdueGold rounded-xl px-6 py-4 mb-4"
            >
              <Text className="text-black text-base font-sora-bold">
                Open Settings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-700 rounded-xl px-6 py-4"
            >
              <Text className="text-white text-base font-sora">Cancel</Text>
            </TouchableOpacity>
          </View>
        </BackgroundTemplate>
      </Modal>
    );
  }

  // Show error state
  if (error) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <BackgroundTemplate>
          <View className="flex-1 justify-center items-center px-6">
            <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
            <Text className="text-white text-xl font-sora-bold mt-6 mb-2 text-center">
              Camera Error
            </Text>
            <Text className="text-gray-400 text-base font-sora text-center mb-8">
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                setIsInitializing(true);
                // Retry permission check
                const checkPermission = async () => {
                  try {
                    const status = await Camera.getCameraPermissionStatus();
                    if (status === "granted") {
                      setHasPermission(true);
                      setIsInitializing(false);
                    } else {
                      const newStatus = await Camera.requestCameraPermission();
                      setHasPermission(newStatus === "granted");
                      setIsInitializing(false);
                    }
                  } catch (err) {
                    setError("Failed to initialize camera");
                    setIsInitializing(false);
                  }
                };
                checkPermission();
              }}
              className="bg-purdueGold rounded-xl px-6 py-4 mb-4"
            >
              <Text className="text-black text-base font-sora-bold">
                Retry
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-700 rounded-xl px-6 py-4"
            >
              <Text className="text-white text-base font-sora">Close</Text>
            </TouchableOpacity>
          </View>
        </BackgroundTemplate>
      </Modal>
    );
  }

  // Show loading state
  if (isInitializing || !device) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <BackgroundTemplate>
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#CFB991" />
            <Text className="text-white text-base font-sora mt-4">
              Initializing camera...
            </Text>
          </View>
        </BackgroundTemplate>
      </Modal>
    );
  }

  // Main camera view
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={visible && hasPermission === true}
          codeScanner={codeScanner}
          torch={torchEnabled ? "on" : "off"}
        />

        {/* Overlay */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerSpacer} />
            {device.hasTorch && (
              <TouchableOpacity
                onPress={toggleTorch}
                style={styles.torchButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={torchEnabled ? "flash" : "flash-outline"}
                  size={24}
                  color={torchEnabled ? "#CFB991" : "white"}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Viewfinder */}
          <View style={styles.viewfinderContainer}>
            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Point camera at barcode
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  overlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  torchButton: {
    padding: 8,
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  viewfinder: {
    width: 280,
    height: 200,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#CFB991",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  instructionsContainer: {
    paddingBottom: 60,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  instructionsText: {
    color: "white",
    fontSize: 16,
    fontFamily: "Sora",
    textAlign: "center",
  },
});

export default VisionBarcodeScanner;

