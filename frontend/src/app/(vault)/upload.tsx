import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { uploadReport } from '../../api/vault';

interface SelectedFile {
  uri: string;
  name: string;
  type: string;
}

const REPORT_TYPES = [
  { id: 'blood_test', label: 'Blood Test' },
  { id: 'lab_report', label: 'Lab Report' },
  { id: 'prescription', label: 'Prescription' },
  { id: 'discharge_summary', label: 'Discharge Summary' },
  { id: 'doctor_consultation', label: 'Doctor Consultation Note' },
  { id: 'vaccination', label: 'Vaccination Record' },
  { id: 'medical_certificate', label: 'Medical Certificate' },
  { id: 'radiology', label: 'Radiology Report' },
  { id: 'other', label: 'Other' },
];

export default function UploadScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const requestPermission = async (type: 'camera' | 'library') => {
    if (Platform.OS === 'web') return true;
    if (type === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permissions are required to take photos.');
        return false;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permissions are required to pick images.');
        return false;
      }
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestPermission('camera');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const name = uri.split('/').pop() || 'photo.jpg';
        setSelectedFile({
          uri,
          name,
          type: 'image/jpeg',
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to launch camera');
    }
  };

  const handlePickLibrary = async () => {
    const hasPermission = await requestPermission('library');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        const name = uri.split('/').pop() || 'image.jpg';
        setSelectedFile({
          uri,
          name,
          type: 'image/jpeg',
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: 'application/pdf',
        });
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) return;

    setUploading(true);
    setUploadProgress(10);

    try {
      const formData = new FormData();
      
      const filePayload = {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.type,
      } as any;

      formData.append('file', filePayload);
      formData.append('record_type', selectedType);

      setUploadProgress(40);
      const response = await uploadReport(formData);
      setUploadProgress(80);

      if (response.success && response.data) {
        setUploadProgress(100);
        setTimeout(() => {
          router.replace('/(vault)/processing');
        }, 500);
      } else {
        Alert.alert('Upload Failed', response.message || 'Could not upload record');
        setUploading(false);
        setUploadProgress(0);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || 'Something went wrong during file upload.';
      Alert.alert('Upload Failed', errMsg);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-between px-6 py-6">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={() => router.back()} className="py-2">
            <Text className="text-teal-700 text-lg font-semibold">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-slate-900">Upload Report</Text>
          <View className="w-12" />
        </View>

        {/* Step 1: Select Report Type */}
        <Text className="text-slate-800 font-bold text-base mb-3">1. Select Report Type</Text>
        <View className="flex-row flex-wrap mb-6">
          {REPORT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              onPress={() => setSelectedType(type.id)}
              className={`mr-2 mb-2 px-4 py-2.5 rounded-full border ${
                selectedType === type.id
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  selectedType === type.id ? 'text-white' : 'text-slate-700'
                }`}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 2: Choose File */}
        {selectedType && (
          <View>
            <Text className="text-slate-800 font-bold text-base mb-3">2. Choose Document Source</Text>
            <View className="space-y-4">
              <TouchableOpacity
                onPress={handleTakePhoto}
                className="w-full bg-white border border-slate-200 py-5 rounded-2xl flex-row items-center justify-center space-x-3 active:bg-slate-100"
              >
                <Text className="text-slate-800 text-base font-bold">📷 Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickLibrary}
                className="w-full bg-white border border-slate-200 py-5 rounded-2xl flex-row items-center justify-center space-x-3 mt-4 active:bg-slate-100"
              >
                <Text className="text-slate-800 text-base font-bold">🖼️ Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handlePickDocument}
                className="w-full bg-white border border-slate-200 py-5 rounded-2xl flex-row items-center justify-center space-x-3 mt-4 active:bg-slate-100"
              >
                <Text className="text-slate-800 text-base font-bold">📄 Select PDF Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedFile && selectedType && (
          <View className="bg-white border border-slate-200 p-5 rounded-2xl mt-8 shadow-sm">
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Ready to Upload
            </Text>
            <Text className="text-slate-800 font-bold text-base mb-1" numberOfLines={1}>
              {selectedFile.name}
            </Text>
            <Text className="text-slate-400 text-xs uppercase">
              {selectedFile.type.split('/')[1]} File (Type:{' '}
              {REPORT_TYPES.find((t) => t.id === selectedType)?.label})
            </Text>

            {uploading ? (
              <View className="mt-6">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-teal-700 font-bold text-sm">Uploading...</Text>
                  <Text className="text-slate-500 text-sm font-semibold">{uploadProgress}%</Text>
                </View>
                <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <View 
                    style={{ width: `${uploadProgress}%` }}
                    className="h-full bg-teal-700 rounded-full"
                  />
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleUpload}
                className="w-full bg-teal-700 py-4 rounded-xl items-center mt-6 active:bg-teal-800"
              >
                <Text className="text-white font-bold text-base">Upload & Analyze</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
