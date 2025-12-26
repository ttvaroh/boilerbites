import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import BackgroundTemplate from "./BackgroundTemplate";

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => Promise<void>;
  isSearching?: boolean;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onClose,
  onScan,
  isSearching = false,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const lastScannedBarcode = useRef<string | null>(null);
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setIsScanning(true);
      lastScannedBarcode.current = null;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    } else {
      setIsScanning(false);
      lastScannedBarcode.current = null;
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    }
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    // Normalize barcode: strip whitespace
    let normalizedBarcode = data.trim();

    if (normalizedBarcode.includes('://') || normalizedBarcode.startsWith('http')) {
      const numericMatch = normalizedBarcode.match(/\d{8,14}$/);
      if (numericMatch) {
        normalizedBarcode = numericMatch[0];
      } else {
        return;
      }
    }

    if (!/^\d+$/.test(normalizedBarcode)) {
      return;
    }

    if (lastScannedBarcode.current === normalizedBarcode || !isScanning || isSearching) {
      return;
    }

    if (!normalizedBarcode || normalizedBarcode.length === 0) {
      return;
    }

    setIsScanning(false);
    lastScannedBarcode.current = normalizedBarcode;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onScan(normalizedBarcode);
    } catch (error) {
      console.error("Error in barcode scan handler:", error);
      setIsScanning(true);
      lastScannedBarcode.current = null;
    }

    scanTimeoutRef.current = setTimeout(() => {
      setIsScanning(true);
      lastScannedBarcode.current = null;
    }, 2000);
  };

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  if (permission && !permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <BackgroundTemplate>
          <View className="flex-1 justify-center items-center px-6">
            <Ionicons name="camera-outline" size={64} color="#CFB991" />
            <Text className="text-white text-xl font-sora-bold mt-6 mb-2 text-center">
              Camera Permission Required
            </Text>
            <Text className="text-gray-400 text-base font-sora text-center mb-6">
              We need camera access to scan barcodes. Please enable camera permissions in your device settings.
            </Text>
            <TouchableOpacity
              onPress={handleOpenSettings}
              className="bg-purdueGold rounded-xl px-6 py-3 mb-4"
            >
              <Text className="text-black font-sora-bold text-base">Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-700 rounded-xl px-6 py-3"
            >
              <Text className="text-white font-sora text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </BackgroundTemplate>
      </Modal>
    );
  }

  if (!permission) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <BackgroundTemplate>
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#CFB991" />
            <Text className="text-white text-base font-sora mt-4">
              Loading camera...
            </Text>
          </View>
        </BackgroundTemplate>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "qr",
            ],
          }}
          onBarcodeScanned={handleBarcodeScanned}
          enableTorch={flashEnabled}
        >
          {/* Viewfinder Overlay */}
          <View style={styles.overlay}>
            {/* Top bar */}
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
              <Text className="text-white text-lg font-sora-bold">
                Scan Barcode
              </Text>
              <TouchableOpacity
                onPress={toggleFlash}
                style={styles.flashButton}
              >
                <Ionicons
                  name={flashEnabled ? "flash" : "flash-outline"}
                  size={24}
                  color={flashEnabled ? "#CFB991" : "white"}
                />
              </TouchableOpacity>
            </View>

            {/* Scanning area indicator */}
            <View style={styles.scanAreaContainer}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              {isSearching ? (
                <>
                  <ActivityIndicator size="small" color="#CFB991" />
                  <Text className="text-white text-base font-sora text-center mt-2">
                    Searching for product...
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-white text-base font-sora text-center">
                    Point camera at barcode
                  </Text>
                  <Text className="text-gray-400 text-sm font-sora text-center mt-2">
                    Make sure the barcode is well-lit and in focus
                  </Text>
                </>
              )}
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  flashButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scanAreaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: 280,
    height: 200,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#CFB991",
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionsContainer: {
    paddingBottom: 50,
    paddingHorizontal: 40,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default BarcodeScanner;

