// ✅ 입력 검증 및 sanitization 유틸리티
// 이메일, 비밀번호, 전화번호 등의 입력값 검증과 XSS 방지를 담당합니다

import type { ValidationResult, RegisterRequest } from '../types';

/**
 * 이메일 형식 검증
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * 비밀번호 형식 검증
 */
export function validatePassword(password: string): boolean {
  // 최소 8자, 영문자+숫자 조합
  return password.length >= 8 && password.length <= 100 && 
         /^(?=.*[A-Za-z])(?=.*\d)/.test(password);
}

/**
 * 한국 전화번호 형식 검증
 */
export function validatePhoneNumber(phone: string): boolean {
  // 한국 전화번호 형식: 010-1234-5678, +82-10-1234-5678, 02-1234-5678 등
  const phoneRegex = /^(\+82|0)(\d{1,2})-?(\d{3,4})-?(\d{4})$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * ID 값 검증 (SQL 인젝션 방지)
 */
export function validateId(id: string): boolean {
  return /^\d+$/.test(id) && parseInt(id) > 0;
}

/**
 * 입력값 sanitization (XSS 방지)
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // More comprehensive XSS protection
  return input
    .trim()
    // Remove HTML tags completely
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove on* event handlers
    .replace(/on\w+\s*=/gi, '')
    // Remove script tags and content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove style tags and content
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Escape remaining special characters
    .replace(/[<>'"&]/g, (match) => {
      const escapeMap: {[key: string]: string} = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match] || match;
    });
}

/**
 * 사업자등록번호 검증 (한국)
 */
export function validateBusinessNumber(businessNumber: string): boolean {
  if (!businessNumber) return true; // 선택사항이므로 빈 값은 허용
  
  // 사업자등록번호 형식: 000-00-00000 또는 0000000000
  const cleaned = businessNumber.replace(/[^0-9]/g, '');
  
  if (cleaned.length !== 10) return false;
  
  // 검증번호 계산
  const checkDigits = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * checkDigits[i];
  }
  
  sum += Math.floor((parseInt(cleaned[8]) * 5) / 10);
  const checkDigit = (10 - (sum % 10)) % 10;
  
  return parseInt(cleaned[9]) === checkDigit;
}

/**
 * 웹사이트 URL 검증
 */
export function validateWebsite(url: string): boolean {
  if (!url) return true; // 선택사항이므로 빈 값은 허용
  
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 허가번호 검증 (에이전트용)
 */
export function validateLicenseNumber(licenseNumber: string): boolean {
  if (!licenseNumber) return false;
  
  // 기본적인 형식 검증 (영문자, 숫자, 하이픈 허용, 5-20자)
  return /^[A-Za-z0-9-]{5,20}$/.test(licenseNumber);
}

/**
 * 국적 검증
 */
export function validateNationality(nationality: string): boolean {
  const validNationalities = [
    '중국', '베트남', '필리핀', '태국', '캄보디아', '몽골', 
    '미국', '일본', '대만', '인도네시아', '말레이시아', '싱가포르',
    '인도', '파키스탄', '방글라데시', '네팔', '스리랑카', '미얀마',
    '라오스', '우즈베키스탄', '카자흐스탄', '키르기스스탄',
    '러시아', '우크라이나', '기타'
  ];
  
  return validNationalities.includes(nationality);
}

/**
 * 비자 유형 검증
 */
export function validateVisaType(visaType: string): boolean {
  const validVisaTypes = [
    'H-2', 'E-9', 'F-4', 'D-4', 'D-2', 'E-7', 'E-1', 'E-2',
    'F-1', 'F-2', 'F-5', 'F-6', 'C-4', 'D-8', 'D-9', '기타', 'none'
  ];
  
  return validVisaTypes.includes(visaType);
}

/**
 * 지역 검증
 */
export function validateRegion(region: string): boolean {
  const validRegions = [
    '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종',
    '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'
  ];
  
  return validRegions.includes(region);
}

/**
 * 업종 검증
 */
export function validateIndustry(industry: string): boolean {
  const validIndustries = [
    'IT/소프트웨어', '제조업', '서비스업', '건설업', '유통/판매',
    '교육', '의료/헬스케어', '금융', '농업', '어업', '축산업',
    '식품/음료', '화학', '자동차', '전자/전기', '섬유/의류',
    '물류/운송', '관광/호텔', '미디어/광고', '법률/회계', '기타'
  ];
  
  return validIndustries.includes(industry);
}

/**
 * 회원가입 데이터 전체 검증
 */
export function validateRegistrationData(data: RegisterRequest): ValidationResult {
  const errors: string[] = [];
  
  // 기본 필드 검증
  if (!data.email) {
    errors.push('이메일이 필요합니다.');
  } else if (!validateEmail(data.email)) {
    errors.push('유효한 이메일 형식이 아닙니다.');
  }
  
  if (!data.password) {
    errors.push('비밀번호가 필요합니다.');
  } else if (!validatePassword(data.password)) {
    errors.push('비밀번호는 최소 8자, 영문자와 숫자를 포함해야 합니다.');
  }
  
  if (!data.userType) {
    errors.push('회원 유형을 선택해야 합니다.');
  }
  
  // 사용자 유형별 추가 검증
  switch (data.userType) {
    case 'jobseeker':
    case 'student':
      if (data.nationality && !validateNationality(data.nationality)) {
        errors.push('유효한 국적을 선택해주세요.');
      }
      if (data.visaType && !validateVisaType(data.visaType)) {
        errors.push('유효한 비자 유형을 선택해주세요.');
      }
      break;
      
    case 'employer':
      if (!data.companyName) {
        errors.push('회사명이 필요합니다.');
      }
      if (!data.industry) {
        errors.push('업종을 선택해야 합니다.');
      } else if (!validateIndustry(data.industry)) {
        errors.push('유효한 업종을 선택해주세요.');
      }
      if (!data.contactPerson) {
        errors.push('담당자명이 필요합니다.');
      }
      if (!data.address) {
        errors.push('주소가 필요합니다.');
      }
      if (!data.region) {
        errors.push('지역을 선택해야 합니다.');
      } else if (!validateRegion(data.region)) {
        errors.push('유효한 지역을 선택해주세요.');
      }
      if (data.phone && !validatePhoneNumber(data.phone)) {
        errors.push('유효한 전화번호 형식이 아닙니다.');
      }
      if (data.businessNumber && !validateBusinessNumber(data.businessNumber)) {
        errors.push('유효한 사업자등록번호가 아닙니다.');
      }
      if (data.website && !validateWebsite(data.website)) {
        errors.push('유효한 웹사이트 URL이 아닙니다.');
      }
      break;
      
    case 'agent':
      if (!data.agencyName) {
        errors.push('에이전시명이 필요합니다.');
      }
      if (!data.licenseNumber) {
        errors.push('허가번호가 필요합니다.');
      } else if (!validateLicenseNumber(data.licenseNumber)) {
        errors.push('유효한 허가번호 형식이 아닙니다.');
      }
      if (!data.country) {
        errors.push('국가 정보가 필요합니다.');
      }
      if (!data.contactPerson) {
        errors.push('담당자명이 필요합니다.');
      }
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * JSON 데이터 안전 파싱
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 파일 확장자 검증
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  if (!filename) return false;
  
  const extension = filename.toLowerCase().split('.').pop();
  return extension ? allowedExtensions.includes(extension) : false;
}

/**
 * 파일 크기 검증 (바이트)
 */
export function validateFileSize(fileSize: number, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return fileSize <= maxSizeInBytes;
}

/**
 * 한국어 이름 검증
 */
export function validateKoreanName(name: string): boolean {
  if (!name) return false;
  
  // 한글, 영문, 공백만 허용, 2-50자
  return /^[가-힣a-zA-Z\s]{2,50}$/.test(name);
}

/**
 * 나이 검증 (생년월일 기준)
 */
export function validateAge(birthDate: string, minAge: number = 14, maxAge: number = 100): boolean {
  if (!birthDate) return true; // 선택사항인 경우
  
  const birth = new Date(birthDate);
  const today = new Date();
  
  if (isNaN(birth.getTime())) return false;
  if (birth > today) return false; // 미래 날짜 불가
  
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) 
    ? age - 1 : age;
  
  return actualAge >= minAge && actualAge <= maxAge;
}

/**
 * 페이지네이션 파라미터 검증
 */
export function validatePaginationParams(page: string, limit: string): { page: number; limit: number } {
  const parsedPage = parseInt(page) || 1;
  const parsedLimit = parseInt(limit) || 10;
  
  return {
    page: Math.max(1, parsedPage),
    limit: Math.min(Math.max(1, parsedLimit), 100) // 최대 100개로 제한
  };
}

export default {
  validateEmail,
  validatePassword,
  validatePhoneNumber,
  validateId,
  sanitizeInput,
  validateBusinessNumber,
  validateWebsite,
  validateLicenseNumber,
  validateNationality,
  validateVisaType,
  validateRegion,
  validateIndustry,
  validateRegistrationData,
  safeJsonParse,
  validateFileExtension,
  validateFileSize,
  validateKoreanName,
  validateAge,
  validatePaginationParams
};