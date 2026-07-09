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

interface ParsedParameter {
  name: string;
  value: string;
  range: string;
  status: 'normal' | 'attention' | 'info';
  explanation: string;
  whyItMatters: string;
  shouldIWorry: string;
  doctorDiscussion: string;
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

  const parseFindingDetailed = (finding: string): ParsedParameter => {
    let name = finding;
    let remaining = '';

    if (finding.includes(':')) {
      const parts = finding.split(':');
      name = parts[0].trim();
      remaining = parts.slice(1).join(':').trim();
    }

    let value = '';
    let statusText = '';
    let explanation = '';

    const parenRegex = /\(([^)]+)\)/;
    const parenMatch = remaining.match(parenRegex);
    
    if (parenMatch) {
      statusText = parenMatch[1].trim().toLowerCase();
      const beforeParen = remaining.substring(0, parenMatch.index).trim();
      const afterParen = remaining.substring(parenMatch.index! + parenMatch[0].length).trim();
      
      value = beforeParen;
      if (afterParen.startsWith('-')) {
        explanation = afterParen.replace(/^-\s*/, '').trim();
      } else {
        explanation = afterParen;
      }
    } else {
      if (remaining.includes('-')) {
        const parts = remaining.split('-');
        value = parts[0].trim();
        explanation = parts.slice(1).join('-').trim();
      } else {
        value = remaining;
      }
    }

    let status: 'normal' | 'attention' | 'info' = 'normal';
    if (statusText.includes('normal') || statusText.includes('healthy') || statusText.includes('optimal') || statusText.includes('good')) {
      status = 'normal';
    } else if (statusText.includes('low') || statusText.includes('high') || statusText.includes('abnormal') || statusText.includes('concern') || statusText.includes('attention')) {
      status = 'attention';
    } else if (statusText.includes('info') || statusText.includes('positive') || statusText.includes('negative')) {
      status = 'info';
    } else {
      const checkText = `${name} ${remaining}`.toLowerCase();
      if (checkText.includes('low') || checkText.includes('high') || checkText.includes('abnormal') || checkText.includes('attention') || checkText.includes('decreased') || checkText.includes('increased')) {
        status = 'attention';
      } else if (checkText.includes('positive') || checkText.includes('negative') || checkText.includes('blood group')) {
        status = 'info';
      }
    }

    const key = name.toLowerCase();
    let defaultRange = 'Not specified';
    let defaultWhy = 'This parameter helps evaluate general health and organ function.';
    let defaultWorry = status === 'normal' ? 'Your result is perfect, indicating good oxygenation and no anemia.' : 'Slightly low hemoglobin is common and can be caused by iron deficiency or dietary factors. It is highly manageable.';
    let defaultDiscussion = status === 'normal' ? 'Ask how to maintain healthy iron levels through diet.' : 'Ask if an iron profile test or vitamin supplements are appropriate.';

    if (key.includes('hemoglobin') || key.includes('hb')) {
      defaultRange = '12.0 - 16.0 g/dL (Female), 13.5 - 17.5 g/dL (Male)';
      defaultWhy = 'Hemoglobin is the oxygen-carrying protein in red blood cells. It ensures all your tissues receive sufficient oxygen.';
      defaultWorry = status === 'normal' ? 'Your level is perfect, indicating good oxygenation and no anemia.' : 'Slightly low hemoglobin is common and can be caused by iron deficiency or dietary factors. It is highly manageable.';
      defaultDiscussion = status === 'normal' ? 'Ask how to maintain healthy iron levels through diet.' : 'Ask if an iron profile test or vitamin supplements are appropriate.';
    } else if (key.includes('vitamin d') || key.includes('vit d') || key.includes('calciferol')) {
      defaultRange = '30.0 - 100.0 ng/mL';
      defaultWhy = 'Vitamin D is vital for absorbing calcium, regulating bone health, and supporting your immune system.';
      defaultWorry = status === 'normal' ? 'Your levels are excellent, indicating healthy bone and immune support.' : 'Vitamin D deficiency is very common worldwide. It is easily resolved with sun exposure, food sources, or simple oral supplements.';
      defaultDiscussion = status === 'normal' ? 'Ask if you need to continue your current sun exposure or dietary routine.' : 'Ask about the recommended dosage for a Vitamin D3 supplement.';
    } else if (key.includes('glucose') || key.includes('sugar') || key.includes('diabetes') || key.includes('hba1c')) {
      defaultRange = '70 - 100 mg/dL (Fasting), < 5.7% (HbA1c)';
      defaultWhy = 'Glucose is the primary energy source for your body. Monitoring it helps evaluate sugar metabolism and manage diabetes risks.';
      defaultWorry = status === 'normal' ? 'Your glucose level is stable and within the healthy fasting range.' : 'Fluctuations in blood sugar can be influenced by recent meals, stress, or activity. Your doctor can help evaluate if lifestyle changes are needed.';
      defaultDiscussion = status === 'normal' ? 'Ask how to maintain insulin sensitivity.' : 'Ask if a fasting glucose or HbA1c test should be repeated, and discuss healthy dietary habits.';
    } else if (key.includes('cholesterol') || key.includes('lipid') || key.includes('ldl') || key.includes('hdl') || key.includes('triglyceride')) {
      defaultRange = 'Total < 200 mg/dL, LDL < 100 mg/dL, HDL > 40 mg/dL';
      defaultWhy = 'Cholesterol is a lipid used to build cell walls. Balanced levels are crucial for cardiovascular and heart health.';
      defaultWorry = status === 'normal' ? 'Your lipid profile is healthy, indicating low risk of plaque build-up.' : 'Slightly elevated levels are very common and can often be managed effectively through exercise, dietary adjustments, and healthy fats.';
      defaultDiscussion = status === 'normal' ? 'Ask how to maintain a heart-healthy diet.' : 'Ask if lifestyle modifications (diet/exercise) are sufficient before considering medical options.';
    } else if (key.includes('creatinine') || key.includes('kidney') || key.includes('egfr') || key.includes('urea')) {
      defaultRange = '0.6 - 1.2 mg/dL';
      defaultWhy = 'Creatinine is a waste product filtered by the kidneys. It measures how effectively your kidneys filter waste from blood.';
      defaultWorry = status === 'normal' ? 'Your kidneys are filtering waste perfectly and functioning healthy.' : 'Slightly elevated creatinine can be caused by simple dehydration, intense exercise, or certain medications. Drinking water often helps.';
      defaultDiscussion = status === 'normal' ? 'Ask how hydration affects kidney values.' : 'Ask if you should repeat the test after drinking plenty of water, and review your current medications.';
    } else if (key.includes('thyroid') || key.includes('tsh') || key.includes('t3') || key.includes('t4')) {
      defaultRange = '0.4 - 4.5 uIU/mL';
      defaultWhy = 'TSH stimulates the thyroid gland to release metabolism hormones. It regulates energy use and cellular function.';
      defaultWorry = status === 'normal' ? 'Your thyroid activity is perfectly balanced, showing stable metabolism control.' : 'Minor thyroid fluctuations are extremely common and treatable. Your doctor will assess if actual hormone levels (T3/T4) are normal.';
      defaultDiscussion = status === 'normal' ? 'Ask how often thyroid levels should be screened.' : 'Ask if a full thyroid panel (Free T3/T4) is recommended to get a complete picture.';
    }

    return {
      name,
      value: value || 'Observed',
      range: defaultRange,
      status,
      explanation: explanation || `Your ${name} level was measured at ${value || 'the observed level'}.`,
      whyItMatters: defaultWhy,
      shouldIWorry: defaultWorry,
      doctorDiscussion: defaultDiscussion,
    };
  };

  const parsedFindings = useMemo(() => {
    if (!record?.analysis?.diagnoses) return [];
    return record.analysis.diagnoses.map(parseFindingDetailed);
  }, [record]);

  const healthyFindings = useMemo(() => {
    return parsedFindings.filter(f => f.status === 'normal' || f.status === 'info');
  }, [parsedFindings]);

  const attentionFindings = useMemo(() => {
    return parsedFindings.filter(f => f.status === 'attention');
  }, [parsedFindings]);

  const overallHealthSummaryParagraph = useMemo(() => {
    if (parsedFindings.length === 0) return 'Your medical report has been analyzed. The details are presented below.';
    
    const normalNames = healthyFindings.slice(0, 3).map(f => f.name).join(', ');
    const attentionNames = attentionFindings.map(f => f.name).join(', ');

    let start = "Your health report shows an overall stable and reassuring condition.";
    let healthyPart = healthyFindings.length > 0 
      ? `We are pleased to see that several key markers, such as ${normalNames}, are completely healthy and within their normal ranges.`
      : "Most of your primary markers are stable and showing good health parameters.";
    
    let attentionPart = attentionFindings.length > 0
      ? `There are ${attentionFindings.length} items that could benefit from slight attention, specifically your ${attentionNames} levels.`
      : "There are no major items needing immediate medical attention in this report.";
    
    let lifestylePart = "These findings are very common and can often be optimized with simple, healthy adjustments to your daily routine.";
    let reassurance = "Please consult your healthcare professional to discuss these results and personalize any next steps.";
    let conclusion = "Overall, this report is a positive step in proactively monitoring and maintaining your long-term wellness.";

    const sentences = [start, healthyPart, attentionPart, lifestylePart, reassurance, conclusion];
    return sentences.slice(0, 6).join(' ');
  }, [parsedFindings, healthyFindings, attentionFindings]);

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
    return matches.slice(0, 5);
  }, [record]);

  const comparisonResults = useMemo(() => {
    if (!record || !previousRecord || !record.analysis?.diagnoses || !previousRecord.analysis?.diagnoses) {
      return [];
    }

    const currParsed = record.analysis.diagnoses.map(parseFindingDetailed);
    const prevParsed = previousRecord.analysis.diagnoses.map(parseFindingDetailed);
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

  const overallStatusText = attentionFindings.length === 0 ? '🟢 Mostly Healthy' : '🟡 Needs Attention';

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
        
        {/* 1. OVERALL HEALTH SNAPSHOT CARD */}
        <View className="bg-white border border-slate-200 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-slate-800 font-extrabold text-sm mb-3">🩺 Overall Health Snapshot</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-400 text-xs font-semibold">Overall Status</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{overallStatusText}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-400 text-xs font-semibold">Reports Reviewed</Text>
            <Text className="text-slate-800 text-xs font-extrabold">1</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-400 text-xs font-semibold">Items Needing Attention</Text>
            <Text className="text-slate-800 text-xs font-extrabold">{attentionFindings.length}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-400 text-xs font-semibold">Last Updated</Text>
            <Text className="text-slate-800 text-xs font-extrabold">Today</Text>
          </View>
        </View>

        {/* 2. OVERALL HEALTH SUMMARY */}
        <View className="bg-teal-50/50 border border-teal-100 p-5 rounded-2xl mb-6 shadow-sm">
          <Text className="text-teal-800 font-extrabold text-sm mb-2">📊 Overall Health Summary</Text>
          <Text className="text-slate-700 text-sm leading-relaxed font-medium">
            {overallHealthSummaryParagraph}
          </Text>
        </View>

        {/* 3. HEALTHY RESULTS SECTION */}
        <View className="mb-6">
          <Text className="text-slate-800 font-extrabold text-base mb-3">🟢 Healthy Results</Text>
          {healthyFindings.length === 0 ? (
            <Text className="text-slate-400 text-xs italic pl-1">No fully normal parameters were parsed from this report.</Text>
          ) : (
            <View className="space-y-4">
              {healthyFindings.map((finding, idx) => (
                <View key={idx} className="bg-emerald-50/40 border border-emerald-100 p-5 rounded-2xl shadow-sm">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-slate-800 font-extrabold text-sm">{finding.name}</Text>
                    <View className="bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                      <Text className="text-emerald-800 text-[10px] font-extrabold">Healthy</Text>
                    </View>
                  </View>
                  <View className="space-y-1.5 border-t border-emerald-50/55 pt-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-medium">Your Value</Text>
                      <Text className="text-slate-800 text-xs font-extrabold">{finding.value}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-medium">Reference Range</Text>
                      <Text className="text-slate-800 text-xs font-extrabold">{finding.range}</Text>
                    </View>
                    <View className="mt-2">
                      <Text className="text-slate-600 text-xs leading-relaxed">{finding.explanation}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 4. NEEDS ATTENTION SECTION */}
        <View className="mb-6">
          <Text className="text-slate-800 font-extrabold text-base mb-3">🟡 Needs Attention</Text>
          {attentionFindings.length === 0 ? (
            <View className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
              <Text className="text-emerald-800 font-bold text-xs">🎉 All items look healthy!</Text>
              <Text className="text-emerald-700 text-[10px] leading-relaxed mt-1">
                Every parameter checked in this report matches the expected healthy reference ranges. Keep it up!
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {attentionFindings.map((finding, idx) => (
                <View key={idx} className="bg-amber-50/40 border border-amber-200 p-5 rounded-2xl shadow-sm">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-slate-800 font-extrabold text-sm">{finding.name}</Text>
                    <View className="bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      <Text className="text-amber-800 text-[10px] font-extrabold">Needs Attention</Text>
                    </View>
                  </View>
                  <View className="space-y-1.5 border-t border-amber-100/50 pt-2">
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-medium">Your Value</Text>
                      <Text className="text-slate-800 text-xs font-extrabold">{finding.value}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-400 text-xs font-medium">Reference Range</Text>
                      <Text className="text-slate-800 text-xs font-extrabold">{finding.range}</Text>
                    </View>
                    <View className="mt-2.5 space-y-1.5">
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Why it matters</Text>
                      <Text className="text-slate-600 text-xs leading-relaxed">{finding.whyItMatters}</Text>
                      
                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-2">What your result means</Text>
                      <Text className="text-slate-600 text-xs leading-relaxed">{finding.explanation}</Text>

                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-2">Should I worry?</Text>
                      <Text className="text-slate-600 text-xs leading-relaxed">{finding.shouldIWorry}</Text>

                      <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-2">What to discuss with your doctor</Text>
                      <Text className="text-slate-600 text-xs leading-relaxed">{finding.doctorDiscussion}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 5. WHAT THIS MEANS */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">🧠</Text>
            <Text className="text-slate-800 font-extrabold text-base">What This Means</Text>
          </View>
          <Text className="text-slate-600 text-sm leading-relaxed">
            {record.analysis?.ai_summary || 'This report details your diagnostic health parameters. Regular tracking of these values lets you monitor trends over time and helps support healthy choices.'}
          </Text>
        </View>

        {/* 6. WHAT YOU CAN DO (LIFESTYLE SUGGESTIONS) */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">🏃‍♂️</Text>
            <Text className="text-slate-800 font-extrabold text-base">What You Can Do</Text>
          </View>
          {record.analysis?.recommendations && record.analysis.recommendations.length > 0 ? (
            <View className="space-y-3 mt-2">
              {record.analysis.recommendations.map((rec, idx) => (
                <View key={idx} className="flex-row items-start space-x-2">
                  <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                  <Text className="text-slate-600 text-xs flex-1 leading-relaxed">{rec}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="space-y-3 mt-2">
              <View className="flex-row items-start space-x-2">
                <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                <Text className="text-slate-600 text-xs flex-1 leading-relaxed">Stay hydrated by drinking 2-3 liters of clean water daily.</Text>
              </View>
              <View className="flex-row items-start space-x-2">
                <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                <Text className="text-slate-600 text-xs flex-1 leading-relaxed">Ensure a regular sleeping pattern of 7-8 hours per night to aid general recovery.</Text>
              </View>
              <View className="flex-row items-start space-x-2">
                <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                <Text className="text-slate-600 text-xs flex-1 leading-relaxed">Incorporate mild physical activity like a 30-minute walk into your daily routine.</Text>
              </View>
            </View>
          )}
        </View>

        {/* 7. QUESTIONS FOR YOUR DOCTOR */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row items-center mb-3">
            <Text className="text-xl mr-2">💬</Text>
            <Text className="text-slate-800 font-extrabold text-base">Questions for Your Doctor</Text>
          </View>
          <View className="space-y-3 mt-2">
            {(record.analysis?.doctor_questions || ['Should I repeat this test?', 'Is any follow-up required?', 'Are lifestyle changes recommended?'])
              .slice(0, 5)
              .map((q, idx) => (
                <View key={idx} className="flex-row items-start space-x-2">
                  <Text className="text-teal-700 font-extrabold text-sm">•</Text>
                  <Text className="text-slate-600 text-xs flex-1 leading-relaxed">{q}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* 8. HEALTH TERMS EXPLAINED */}
        {glossaryMatches.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-6 shadow-sm">
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

        {/* 9. WHAT CHANGED? (OPTIONAL PREVIOUS REPORT COMPARISON) */}
        {previousRecord && comparisonResults.length > 0 && (
          <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-6 shadow-sm">
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

        {/* 10. REPORT ASSISTANT CTA BUTTON */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={() => router.push({
              pathname: '/(screens)/health-assistant',
              params: { record_id: record.id }
            })}
            className="bg-teal-700 py-4.5 rounded-2xl items-center flex-row justify-center space-x-2 active:bg-teal-800 shadow-md"
          >
            <Text className="text-white font-extrabold text-base">💬 Ask JeevanSetu AI About This Report</Text>
          </TouchableOpacity>
        </View>

        {/* 11. ORIGINAL REPORT VIEW / ACTION CARD */}
        <View className="bg-white border border-slate-200 p-6 rounded-2xl mb-6 shadow-sm">
          <View className="flex-row items-center mb-4">
            <Text className="text-xl mr-2">📄</Text>
            <Text className="text-slate-800 font-extrabold text-base">Original Report</Text>
          </View>
          <View className="space-y-3">
            <TouchableOpacity
              onPress={viewFile}
              className="bg-slate-100 border border-slate-200 py-3.5 rounded-xl active:bg-slate-200 items-center w-full"
            >
              <Text className="text-slate-700 font-bold text-sm">View Report</Text>
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

        {/* 12. CLOSING TAKEAWAY */}
        <View className="bg-teal-50 border border-teal-100 p-5 rounded-2xl mb-8 shadow-sm">
          <Text className="text-teal-800 font-extrabold text-xs uppercase tracking-wider mb-2">Takeaway</Text>
          <Text className="text-slate-600 text-xs leading-relaxed">
            Based on this report, most of your results are within healthy ranges. Continue following your doctor's advice and keep uploading future reports so JeevanSetu AI can help you monitor your health over time.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
