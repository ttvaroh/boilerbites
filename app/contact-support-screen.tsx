import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    Linking,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import BackgroundTemplate from "../components/BackgroundTemplate";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

type ContactMethod = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  action: () => void;
  color: string;
};

export default function ContactSupportScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { subject: initialSubject, message: initialMessage } = useLocalSearchParams<{
    subject?: string;
    message?: string;
  }>();
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Pre-fill form with passed parameters
  useEffect(() => {
    if (initialSubject) {
      setSubject(initialSubject);
    }
    if (initialMessage) {
      setMessage(initialMessage);
    }
  }, [initialSubject, initialMessage]);

  const handleEmailSupport = () => {
    const email = "support@yourapp.com"; // Replace with your support email
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject || "Support Request")}&body=${encodeURIComponent(message || "")}`;
    
    Linking.canOpenURL(mailto)
      .then((supported) => {
        if (supported) {
          Linking.openURL(mailto);
        } else {
          Alert.alert("Error", "Unable to open email client");
        }
      })
      .catch(() => Alert.alert("Error", "Unable to open email client"));
  };

  const handleSubmitTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Validation Error", "Please fill in both subject and message.");
      return;
    }

    setIsSending(true);
    try {
      // Insert support ticket into Supabase
      const { error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user?.id,
          user_email: user?.email,
          subject: subject.trim(),
          message: message.trim(),
          status: "open",
        });

      if (error) {
        console.error("Support ticket error:", error);
        // Fallback to email if database insert fails
        handleEmailSupport();
        return;
      }

      Alert.alert(
        "Ticket Submitted",
        "Your support request has been received. We'll get back to you within 24-48 hours.",
        [
          {
            text: "OK",
            onPress: () => {
              setSubject("");
              setMessage("");
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Support ticket error:", error);
      Alert.alert("Error", "Failed to submit ticket. Please try again or contact us via email.");
    } finally {
      setIsSending(false);
    }
  };

  const contactMethods: ContactMethod[] = [
    {
      id: "email",
      icon: "mail",
      title: "Email Support",
      description: "Send your questions and feedback to our support team",
      action: () => {
        Linking.openURL("mailto:ttvaroh@icloud.com");
      },
      color: "#CFB991",
    },
    {
      id: "discord",
      icon: "logo-discord",
      title: "Join Our Discord",
      description: "Chat with the community and get help",
      action: () => {
        Linking.openURL("https://discord.gg/FdebEjfF"); // Replace with your Discord invite link
      },
      color: "#5865F2",
    },
  ];

  return (
    <BackgroundTemplate paddingBottom={0}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-16 pb-8">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="mr-4 p-2"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-2xl font-sora-bold">
              Contact Support
            </Text>
          </View>

          {/* Hero Section */}
          <View className="bg-gradient-to-br from-purdueGold/20 to-yellow-600/10 rounded-2xl p-6 mb-6 border border-purdueGold/30">
            <View className="flex-row items-center mb-3">
              <View className="bg-purdueGold rounded-full p-3 mr-4">
                <Ionicons name="chatbubbles" size={28} color="#000000" />
              </View>
              <View className="flex-1">
                <Text className="text-white text-xl font-sora-bold">
                  We're Here to Help
                </Text>
                <Text className="text-gray-300 text-sm font-sora mt-1">
                  Response time: 24-48 hours
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Contact Methods */}
          <Text className="text-white text-lg font-sora-bold">
            Quick Contact
          </Text>
          <View className="space-y-3 mb-6">
            {contactMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                onPress={method.action}
                className="bg-gray-800/40 backdrop-blur-xl rounded-xl p-4 border border-gray-700/30 flex-row items-center"
                activeOpacity={0.7}
                style={{ marginTop: 10 }}
              >
                <View
                  className="rounded-full p-3 mr-4"
                  style={{ backgroundColor: `${method.color}20` }}
                >
                  <Ionicons name={method.icon} size={24} color={method.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-sora-semibold">
                    {method.title}
                  </Text>
                  <Text className="text-gray-400 text-sm font-sora mt-0.5">
                    {method.description}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Support Ticket Form */}
          <View className="bg-gray-800/40 backdrop-blur-xl rounded-2xl p-5 mb-6 border border-gray-700/30">
            <View className="flex-row items-center mb-4">
              <Ionicons name="document-text" size={22} color="#CFB991" />
              <Text className="text-white text-lg font-sora-bold ml-2">
                Submit a Support Ticket
              </Text>
            </View>

            {user && (
              <View className="bg-gray-900/30 rounded-xl px-4 py-3 mb-4 border border-gray-700/20">
                <Text className="text-gray-400 text-xs font-sora mb-1">
                  Submitting as
                </Text>
                <Text className="text-white text-sm font-sora">
                  {user.email}
                </Text>
              </View>
            )}

            {/* Subject */}
            <View className="mb-4">
              <Text className="text-gray-300 text-sm font-sora-semibold mb-2">
                Subject
              </Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief description of your issue"
                placeholderTextColor="#6B7280"
                className="bg-gray-900/50 rounded-xl px-4 py-3.5 text-white text-base font-sora border border-gray-600/40"
                autoCapitalize="sentences"
              />
            </View>

            {/* Message */}
            <View className="mb-5">
              <Text className="text-gray-300 text-sm font-sora-semibold mb-2">
                Message
              </Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Describe your issue in detail..."
                placeholderTextColor="#6B7280"
                className="bg-gray-900/50 rounded-xl px-4 py-3.5 text-white text-base font-sora border border-gray-600/40"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                autoCapitalize="sentences"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmitTicket}
              disabled={isSending || !subject.trim() || !message.trim()}
              className={`py-4 px-6 rounded-xl flex-row items-center justify-center ${
                isSending || !subject.trim() || !message.trim()
                  ? "bg-gray-700"
                  : "bg-purdueGold"
              }`}
              activeOpacity={0.8}
            >
              {isSending ? (
                <Text className="text-white text-base font-sora-semibold">
                  Submitting...
                </Text>
              ) : (
                <>
                  <Ionicons
                    name="send"
                    size={20}
                    color={subject.trim() && message.trim() ? "#000000" : "#6B7280"}
                  />
                  <Text
                    className={`text-base font-sora-semibold ml-2 ${
                      subject.trim() && message.trim() ? "text-black" : "text-gray-500"
                    }`}
                  >
                    Submit Ticket
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Additional Info */}
          <View className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#60A5FA" />
              <View className="flex-1 ml-3">
                <Text className="text-blue-300 text-sm font-sora-semibold mb-1">
                  Before contacting support
                </Text>
                <Text className="text-blue-200 text-xs font-sora leading-5">
                  Check our FAQ section for instant answers to common questions. Most issues can be resolved quickly through our help center.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </BackgroundTemplate>
  );
}