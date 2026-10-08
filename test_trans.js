function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const originalText = `
        Accurate clinical knowledge on blood-related diseases, transfusion cycles, donor matching rules,
        and essential safety precautions for patients and families worldwide.
      `;
const dictEn = 'Accurate clinical knowledge on blood-related diseases, transfusion cycles, donor matching rules, and essential safety precautions for patients and families worldwide.';
const dictBn = 'রক্ত সম্পর্কিত রোগ, সঞ্চালন চক্র, রক্তদাতা ম্যাচিং নিয়ম এবং রোগীদের সুরক্ষামূলক ক্লিনিক্যাল জ্ঞান।';

const pattern = escapeRegex(dictEn).replace(/\s+/g, '\\s+');
const regex = new RegExp(pattern, 'gi');

console.log('Matches:', regex.test(originalText));
console.log('Replaced:\n' + originalText.replace(regex, dictBn).trim());
