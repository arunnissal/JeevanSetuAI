import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Linking, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getRecordDetail, getVaultRecords } from '../../api/vault';
import { colors } from '../../theme/colors';

interface RecordDetail {
  id: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  record_type: 'blood_test' | 'lab_report' | 'prescription' | 'discharge_summary' | 'doctor_consultation' | 'vaccination' | 'medical_certificate' | 'radiology' | 'other';
  created_at: string;
  metadata: {
    original_filename?: string;
    file_size?: number;
    hospital_name?: string;
    doctor_name?: string;
    report_date?: string;
  };
  file: {
    file_url: string;
  };
  analysis?: {
    ocr_text?: string;
    ai_summary?: string;
    diagnoses?: string[];
    medicines?: string[];
    recommendations?: string[];
    doctor_questions?: string[];
    medical_disclaimer?: string;
  };
}

const HEALTH_TERMS_GLOSSARY: { [key: string]: { term: string; definition: string } } = {
  hemoglobin: {
    term: 'Hemoglobin',
    definition: 'Hemoglobin is a protein in red blood cells that carries oxygen from your lungs to the rest of your body.'
  },
  'vitamin d': {
    term: 'Vitamin D',
    definition: 'Vitamin D helps your body absorb calcium, which is essential for building and maintaining strong bones and muscles.'
  },
  glucose: {
    term: 'Blood Sugar (Glucose)',
    definition: 'Glucose is the main sugar found in your blood. It comes from the food you eat and is your body\'s primary source of energy.'
  },
  sugar: {
    term: 'Blood Sugar (Glucose)',
    definition: 'Glucose is the main sugar found in your blood. It comes from the food you eat and is your body\'s primary source of energy.'
  },
  cholesterol: {
    term: 'Cholesterol',
    definition: 'Cholesterol is a waxy substance found in your blood. Your body needs it to build healthy cells, but high levels can increase heart risks.'
  },
  creatinine: {
    term: 'Creatinine',
    definition: 'Creatinine is a waste product filtered by your kidneys. Measuring it helps evaluate how well your kidneys are functioning.'
  },
  bilirubin: {
    term: 'Bilirubin',
    definition: 'Bilirubin is a yellowish substance produced during the normal breakdown of red blood cells. High levels can indicate liver issues.'
  },
  thyroid: {
    term: 'TSH (Thyroid)',
    definition: 'TSH controls your thyroid gland. Measuring it helps identify if your thyroid is underactive or overactive.'
  },
  tsh: {
    term: 'TSH (Thyroid)',
    definition: 'TSH controls your thyroid gland. Measuring it helps identify if your thyroid is underactive or overactive.'
  },
  platelet: {
    term: 'Platelets',
    definition: 'Platelets are tiny blood cells that help your body form clots to stop bleeding when you have an injury.'
  }
};

export default function RecordDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [record, setRecord] = useState<RecordDetail | null>(null);
  const [previousRecord, setPreviousRecord] = useState<RecordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getRecordDetail(id);
      if (response.success && response.data) {
        const currentRecordData = response.data;
        setRecord(currentRecordData);

        // Fetch other completed records to check for a previous comparison target
        const vaultResponse = await getVaultRecords();
        if (vaultResponse.success && vaultResponse.data) {
          const matchingPrevious = vaultResponse.data.filter(
            (r: any) =>
              r.record_type === currentRecordData.record_type &&
              r.processing_status === 'completed' &&
              r.id !== currentRecordData.id &&
              new Date(r.created_at).getTime() < new Date(currentRecordData.created_at).getTime()
          );

          if (matchingPrevious.length > 0) {
            // Sort by date descending and set the most recent one
            matchingPrevious.sort(
              (a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setPreviousRecord(matchingPrevious[0]);
          }
        }
      } else {
        setError(response.message || 'Failed to load details.');
      }
    } catch (err: any) {
      setError('Unable to load report details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const getRecordTypeBadge = (type: string) => {
    switch (type) {
      case 'blood_test': return '🩸 Blood Test';
      case 'lab_report': return '🧪 Lab Report';
      case 'prescription': return '💊 Prescription';
      case 'radiology': return '🩻 Radiology';
      case 'doctor_consultation': return '👨‍⚕️ Consultation';
      case 'discharge_summary': return '🏥 Discharge';
      case 'vaccination': return '💉 Vaccination';
      case 'medical_certificate': return '📄 Medical Certificate';
      default: return '📁 Other';
    }
  };

  const parseFinding = (finding: string) => {
    let name = finding;
    let explanation = '';

    if (finding.includes(':')) {
      const parts = finding.split(':');
      name = parts[0].trim();
      explanation = parts.slice(1).join(':').trim();
    }

    const checkText = `${name} ${explanation}`.toLowerCase();
    let status: 'normal' | 'attention' | 'info' = 'normal';

    if (checkText.includes('blood group') || checkText.includes('blood type') || checkText.includes('positive') || checkText.includes('negative')) {
      status = 'info';
    } else if (
      checkText.includes('low') ||
      checkText.includes('high') ||
      checkText.includes('deficien') ||
      checkText.includes('attention') ||
      checkText.includes('abnormal') ||
      checkText.includes('concern') ||
      checkText.includes('decreased') ||
      checkText.includes('increased') ||
      checkText.includes('alert')
    ) {
      status = 'attention';
    }

    return { name, explanation: explanation || 'Observed finding.', status };
  };

  // 3. Important findings parsed list
  const parsedFindings = useMemo(() => {
    if (!record?.analysis?.diagnoses) return [];
    return record.analysis.diagnoses.map(parseFinding);
  }, [record]);

  // 6. Glossary matching list
  const glossaryMatches = useMemo(() => {
    if (!record) return [];
    const textToMatch = `${record.metadata?.original_filename || ''} ${
      record.analysis?.ocr_text || ''
    } ${JSON.stringify(record.analysis?.diagnoses || [])}`.toLowerCase();

    const matches = [];
    for (const [key, item] of Object.entries(HEALTH_TERMS_GLOSSARY)) {
      if (textToMatch.includes(key)) {
        matches.push(item);
      }
    }
    // Limit to displaying 3 matched terms
    return matches.slice(0, 3);
  }, [record]);

  // 7. Comparison lists
  const comparisonResults = useMemo(() => {
    if (!record || !previousRecord || !record.analysis?.diagnoses || !previousRecord.analysis?.diagnoses) {
      return [];
    }

    const currParsed = record.analysis.diagnoses.map(parseFinding);
    const prevParsed = previousRecord.analysis.diagnoses.map(parseFinding);
    const matches = [];

    for (const curr of currParsed) {
      const prev = prevParsed.find(
        (p) =>
          p.name.toLowerCase().includes(curr.name.toLowerCase()) ||
          curr.name.toLowerCase().includes(p.name.toLowerCase())
      );

      if (prev) {
        if (curr.status === 'normal' && prev.status === 'normal') {
          matches.push({
            name: curr.name,
            icon: '🟢',
            text: 'Stable compared with your previous report.'
          });
        } else if (curr.status === 'normal' && prev.status === 'attention') {
          matches.push({
            name: curr.name,
            icon: '🟢',
            text: 'Improved compared with your previous report.'
          });
        } else if (curr.status === 'attention' && prev.status === 'normal') {
          matches.push({
            name: curr.name,
            icon: '🟡',
            text: 'Slightly lower or elevated compared with your previous report.'
          });
        } else {
          matches.push({
            name: curr.name,
            icon: '🟡',
            text: 'Continues to be outside the normal range.'
          });
        }
      } else {
        matches.push({
          name: curr.name,
          icon: curr.status === 'normal' ? '🟢' : curr.status === 'attention' ? '🟡' : '🔵',
          text: 'New finding not detailed in your previous report.'
        });
      }
    }
    return matches;
  }, [record, previousRecord]);

  const viewFile = () => {
    if (record?.file?.file_url) {
      Linking.openURL(record.file.file_url).catch(() => {
        Alert.alert('Error', 'Cannot open document link');
      });
    }
  };

  const shareRecord = async () => {
    if (!record?.file?.file_url) return;
    try {
      await Share.share({
        message: `My Medical Report summary for: ${
          record.metadata.original_filename || 'medical_report.pdf'
        }\nView here: ${record.file.file_url}`,
        title: record.metadata.original_filename || 'Medical Report'
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to share report.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="text-slate-500 mt-4 font-semibold">Loading report summary...</Text>
      </SafeAreaView>
    );
  }

  // Error State with Retry CTA
  if (error || !record) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Text className="text-4xl mb-4">⚠️</Text>
        <Text className="text-slate-800 font-extrabold text-lg text-center">We couldn't load this report.</Text>
        <Text className="text-slate-500 text-center mt-2 mb-6 px-4">
          Please try again or go back to the vault dashboard.
        </Text>
        <View className="flex-row space-x-3 w-full">
          <TouchableOpacity
            onPress={fetchDetails}
            className="flex-1 bg-teal-700 py-3.5 rounded-xl items-center"
          >
            <Text className="text-white font-bold text-sm">Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-1 bg-slate-100 border border-slate-200 py-3.5 rounded-xl items-center"
          >
            <Text className="text-slate-700 font-bold text-sm">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Empty State: preparing summary indicator
  if (record.processing_status !== 'completed') {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center px-6">
        <ActivityIndicator size="large" color={colors.primary} className="mb-4" />
        <Text className="text-slate-800 font-extrabold text-lg text-center">
          We're preparing your report summary.
        </Text>
        <Text className="text-slate-500 text-center mt-2 mb-6 px-4">
          Please check back in a few moments while our AI extracts and simplifies your records.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-teal-700 px-8 py-3.5 rounded-xl active:bg-teal-800"
        >
          <Text className="text-white font-bold text-sm">Back to Vault</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50 px-6 py-4">
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity onPress={() => router.back()} className="py-2 flex-row items-center">
          <Text className="text-teal-700 text-base font-extrabold mr-1">⇠</Text>
          <Text className="text-teal-700 text-sm font-semibold">Back</Text>
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-slate-900">Report Details</Text>
        <View className="w-12" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* 1. REPORT INFORMATION (Compact) */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-4 shadow-sm">
          <View className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200 self-start mb-3">
            <Text className="text-slate-700 text-[10px] font-bold uppercase tracking-wide">
              {getRecordTypeBadge(record.record_type)}
            </Text>
          </View>
          <Text className="text-slate-800 font-extrabold text-base mb-3 leading-tight" numberOfLines={1}>
            {record.metadata.original_filename || 'Medical Report'}
          </Text>

          <View className="border-t border-slate-100 pt-3 space-y-2">
            {record.metadata.hospital_name && (
              <View className="flex-row justify-between">
                <Text className="text-slate-400 text-xs font-medium">Hospital</Text>
                <Text className="text-slate-700 text-xs font-bold">{record.metadata.hospital_name}</Text>
              </View>
            )}
            {record.metadata.doctor_name && (
              <View className="flex-row justify-between">
                <Text className="text-slate-400 text-xs font-medium">Doctor</Text>
                <Text className="text-slate-700 text-xs font-bold">{record.metadata.doctor_name}</Text>
              </View>
            )}
            {record.metadata.report_date && (
              <View className="flex-row justify-between">
                <Text className="text-slate-400 text-xs font-medium">Report Date</Text>
                <Text className="text-slate-700 text-xs font-bold">{record.metadata.report_date}</Text>
              </View>
            )}
            <View className="flex-row justify-between">
              <Text className="text-slate-400 text-xs font-medium">Uploaded Date</Text>
              <Text className="text-slate-700 text-xs font-bold">
                {new Date(record.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. EASY EXPLANATION (HERO SECTION) */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">🧠</Text>
            <Text className="text-slate-800 font-extrabold text-base">Easy Explanation</Text>
          </View>
          <Text className="text-slate-600 text-sm leading-relaxed mb-4">
            {record.analysis?.ai_summary || 'No simplified summary available.'}
          </Text>

          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/(screens)/health-assistant',
              params: { record_id: record.id }
            })}
            className="bg-teal-50 border border-teal-200 py-3.5 rounded-xl items-center mb-4 flex-row justify-center space-x-2 active:bg-teal-100"
          >
            <Text className="text-teal-800 font-bold text-sm">💬 Ask About This Report</Text>
          </TouchableOpacity>

          <View className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <Text className="text-slate-400 text-[10px] text-center font-semibold">
              This explanation is AI-generated to help you understand your report.
            </Text>
          </View>
        </View>

        {/* 3. KEY FINDINGS */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">📌</Text>
            <Text className="text-slate-800 font-extrabold text-base">Key Findings</Text>
          </View>

          {parsedFindings.length === 0 ? (
            <Text className="text-slate-400 text-xs italic">No key findings identified.</Text>
          ) : (
            <View className="space-y-4 mt-2">
              {parsedFindings.map((finding, idx) => {
                const isNormal = finding.status === 'normal';
                const isAttention = finding.status === 'attention';

                return (
                  <View key={idx} className="border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                    <View className="flex-row items-center justify-between mb-1.5">
                      <Text className="text-slate-800 font-bold text-sm">{finding.name}</Text>
                      <View
                        className={`px-2.5 py-0.5 rounded-full border flex-row items-center space-x-1 ${
                          isNormal
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-100'
                            : isAttention
                            ? 'text-amber-700 bg-amber-50 border-amber-100'
                            : 'text-sky-700 bg-sky-50 border-sky-100'
                        }`}
                      >
                        <Text className="text-[10px] font-extrabold">
                          {isNormal ? '🟢 Normal' : isAttention ? '🟡 Needs Attention' : '🔵 Info'}
                        </Text>
                      </View>
                    </View>
                    <Text className="text-slate-500 text-xs leading-relaxed">{finding.explanation}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 4. MEDICINES MENTIONED */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">💊</Text>
            <Text className="text-slate-800 font-extrabold text-base">Medicines Mentioned</Text>
          </View>
          {record.analysis?.medicines && record.analysis.medicines.length > 0 ? (
            <View className="space-y-2 mt-2">
              {record.analysis.medicines.map((med, idx) => (
                <View key={idx} className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
                  <Text className="text-slate-700 font-bold text-xs">{med}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-slate-400 text-xs italic mt-1">
              No medicines were identified in this report.
            </Text>
          )}
        </View>

        {/* 5. QUESTIONS YOU CAN ASK YOUR DOCTOR */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">💬</Text>
            <Text className="text-slate-800 font-extrabold text-base">Questions for Your Doctor</Text>
          </View>
          {record.analysis?.doctor_questions && record.analysis.doctor_questions.length > 0 ? (
            <View className="space-y-2 mt-2">
              {record.analysis.doctor_questions.map((q, idx) => (
                <View key={idx} className="flex-row items-start space-x-2">
                  <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                  <Text className="text-slate-600 text-xs flex-1 leading-relaxed">{q}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="space-y-2 mt-2">
              <View className="flex-row items-start space-x-2">
                <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                <Text className="text-slate-600 text-xs flex-1 leading-relaxed">Should I repeat this test?</Text>
              </View>
              <View className="flex-row items-start space-x-2">
                <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                <Text className="text-slate-600 text-xs flex-1 leading-relaxed">Is any follow-up required?</Text>
              </View>
              <View className="flex-row items-start space-x-2">
                <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                <Text className="text-slate-600 text-xs flex-1 leading-relaxed">Are lifestyle changes recommended?</Text>
              </View>
            </View>
          )}
        </View>

        {/* 6. HEALTH TERMS EXPLAINED */}
        {glossaryMatches.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Text className="text-xl mr-2">📚</Text>
              <Text className="text-slate-800 font-extrabold text-base">Health Terms Explained</Text>
            </View>
            <View className="space-y-3 mt-2">
              {glossaryMatches.map((item, idx) => (
                <View key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <Text className="text-slate-800 font-bold text-xs mb-1">{item.term}</Text>
                  <Text className="text-slate-500 text-[11px] leading-relaxed">{item.definition}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 7. WHAT CHANGED? (ONLY IF PREVIOUS REPORT EXISTS) */}
        {previousRecord && comparisonResults.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
            <View className="flex-row items-center mb-3">
              <Text className="text-xl mr-2">📈</Text>
              <Text className="text-slate-800 font-extrabold text-base">What Changed?</Text>
            </View>
            <View className="space-y-3 mt-2">
              {comparisonResults.map((cmp, idx) => (
                <View key={idx} className="flex-row items-start space-x-2">
                  <Text className="text-sm">{cmp.icon}</Text>
                  <View className="flex-1">
                    <Text className="text-slate-800 font-bold text-xs">{cmp.name}</Text>
                    <Text className="text-slate-500 text-[11px] leading-relaxed mt-0.5">{cmp.text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 8. ORIGINAL REPORT */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-4 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Text className="text-xl mr-2">📄</Text>
            <Text className="text-slate-800 font-extrabold text-base">Original Report</Text>
          </View>
          <View className="space-y-3">
            <TouchableOpacity
              onPress={viewFile}
              className="bg-teal-700 py-3.5 rounded-xl active:bg-teal-800 items-center w-full"
            >
              <Text className="text-white font-bold text-sm">View Report</Text>
            </TouchableOpacity>

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={shareRecord}
                className="flex-1 bg-slate-100 border border-slate-200 py-3.5 rounded-xl active:bg-slate-200 items-center"
              >
                <Text className="text-slate-700 font-bold text-sm">Share</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={viewFile}
                className="flex-1 bg-slate-100 border border-slate-200 py-3.5 rounded-xl active:bg-slate-200 items-center"
              >
                <Text className="text-slate-700 font-bold text-sm">Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 9. ABOUT THIS SUMMARY */}
        <View className="bg-slate-100 border border-slate-200 p-5 rounded-2xl mb-8 shadow-sm">
          <Text className="text-slate-700 font-extrabold text-xs mb-1.5">About this Summary</Text>
          <Text className="text-slate-500 text-[11px] leading-relaxed">
            This explanation was generated using AI to help you better understand your medical report. It should not replace advice from a qualified healthcare professional.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
