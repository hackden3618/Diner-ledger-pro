import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";

interface ActionDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  isRequired?: boolean;
  label?: string;
  modalTitle?: string;
}

export default function ActionDropdown({
  value,
  onChange,
  options,
  placeholder = "Select...",
  isRequired = false,
  label = "ACTION PROVIDER",
  modalTitle = "Select Option",
}: ActionDropdownProps) {
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueOptions = useMemo(() => {
    const unique = [...new Set(options.filter((s) => s?.trim()))];
    return unique.sort((a, b) => a.localeCompare(b));
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return uniqueOptions;
    return uniqueOptions.filter((opt) =>
      opt.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [uniqueOptions, searchQuery]);

  const isNewOption =
    searchQuery.trim().length > 0 &&
    !uniqueOptions.find((opt) => opt.toLowerCase() === searchQuery.trim().toLowerCase());

  const selectedLabel = value || placeholder;
  const screenHeight = Dimensions.get("window").height;

  const handleSelect = (val: string) => {
    onChange(val.trim());
    setVisible(false);
    setSearchQuery("");
  };

  return (
    <View>
      {label && (
        <Text
          className={`text-[11px] font-bold ${
            isRequired ? "text-destructive" : "text-muted-foreground"
          } tracking-[1px] mb-2 uppercase`}
        >
          {label} {isRequired && "(Required)"}
        </Text>
      )}

      <TouchableOpacity
        className={`bg-input border-[0.5px] rounded-[12px] px-4 py-4 mb-5 flex-row items-center justify-between ${
          value === "" && isRequired ? "border-destructive/60" : "border-border"
        }`}
        onPress={() => setVisible(true)}
      >
        <Text
          className={`text-[15px] ${
            value ? "text-foreground" : "text-muted-dark"
          }`}
        >
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#a1b0a3" />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-background/60"
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />

        <KeyboardAvoidingView 
          behavior="padding" 
          className="bg-card rounded-t-[24px] border-t border-border-light shadow-lg"
          style={{ maxHeight: screenHeight * 0.7 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-border-light">
            <Text className="text-[16px] font-bold text-foreground">
              {modalTitle}
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)} className="p-1">
              <Ionicons name="close-circle" size={24} color="#a1b0a3" />
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View className="px-6 py-3 border-b border-border-light bg-muted/30">
            <View className="flex-row items-center bg-input border-[0.5px] border-border rounded-[12px] px-3 py-2">
              <Ionicons name="search" size={18} color="#a1b0a3" />
              <TextInput
                className="flex-1 text-[14px] text-foreground p-0 ml-2"
                placeholder="Search or type new..."
                placeholderTextColor="#a1b0a3"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          </View>

          {/* List */}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item, idx) => `${item}-${idx}`}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="px-6 py-4 border-b border-border-light flex-row items-center justify-between"
                onPress={() => handleSelect(item)}
              >
                <Text
                  className={`text-[15px] ${
                    value === item
                      ? "font-bold text-primary"
                      : "text-foreground"
                  }`}
                >
                  {item}
                </Text>
                {value === item && (
                  <Ionicons name="checkmark-circle" size={22} color="#2ecc71" />
                )}
              </TouchableOpacity>
            )}
            ListHeaderComponent={
              isNewOption ? (
                <TouchableOpacity
                  className="px-6 py-4 border-b border-border-light flex-row items-center bg-primary/5"
                  onPress={() => handleSelect(searchQuery)}
                >
                  <Ionicons name="add-circle" size={22} color="#2ecc71" />
                  <Text className="text-[15px] font-bold text-primary ml-3">
                    {`Add "${searchQuery.trim()}"`}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
            ListEmptyComponent={
              !isNewOption ? (
                <View className="px-6 py-8 items-center">
                  <Ionicons name="people-outline" size={40} color="#a1b0a3" />
                  <Text className="text-[14px] text-muted-foreground mt-3 text-center">
                    No matching options found. Type to add a new one.
                  </Text>
                </View>
              ) : null
            }
          />
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
