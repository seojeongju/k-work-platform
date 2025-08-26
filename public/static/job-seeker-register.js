// 구직정보 등록 JavaScript

class JobSeekerRegistration {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 2;
        this.formData = {};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
    }

    setupEventListeners() {
        // 네비게이션 버튼들
        document.getElementById('next-btn').addEventListener('click', () => {
            this.nextStep();
        });

        document.getElementById('prev-btn').addEventListener('click', () => {
            this.prevStep();
        });

        // 폼 제출
        document.getElementById('job-seeker-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitForm();
        });

        // 성공 모달 버튼들
        document.getElementById('view-jobs-btn').addEventListener('click', () => {
            window.location.href = '/';
        });

        document.getElementById('register-more-btn').addEventListener('click', () => {
            this.resetForm();
        });

        // 실시간 유효성 검사
        this.setupRealTimeValidation();
    }

    setupRealTimeValidation() {
        // 이메일 형식 검사
        document.getElementById('email').addEventListener('blur', (e) => {
            this.validateEmail(e.target);
        });

        // 비밀번호 강도 검사
        document.getElementById('password').addEventListener('input', (e) => {
            this.validatePassword(e.target);
        });

        // 전화번호 형식 검사
        document.getElementById('phone').addEventListener('blur', (e) => {
            this.validatePhone(e.target);
        });

        // 급여 범위 검사
        document.getElementById('desired_salary_max').addEventListener('blur', () => {
            this.validateSalaryRange();
        });
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStepData();
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateUI();
            }
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateUI();
        }
    }

    updateUI() {
        // 진행 단계 업데이트
        this.updateProgressSteps();
        
        // 컨텐츠 표시/숨김
        document.querySelectorAll('.step-content').forEach((content, index) => {
            if (index + 1 === this.currentStep) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });

        // 버튼 상태 업데이트
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (this.currentStep === 1) {
            prevBtn.classList.add('hidden');
        } else {
            prevBtn.classList.remove('hidden');
        }

        if (this.currentStep === this.totalSteps) {
            nextBtn.classList.add('hidden');
            submitBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            submitBtn.classList.add('hidden');
        }
    }

    updateProgressSteps() {
        for (let i = 1; i <= this.totalSteps; i++) {
            const stepCircle = document.querySelector(`.flex:nth-child(${i * 2 - 1}) .w-8`);
            const stepText = document.querySelector(`.flex:nth-child(${i * 2 - 1}) span`);
            const stepLine = document.querySelector(`.flex:nth-child(${i * 2 - 1}) + .w-16`);

            if (i <= this.currentStep) {
                stepCircle.classList.remove('bg-gray-200', 'text-gray-500');
                stepCircle.classList.add('bg-primary', 'text-white');
                stepText.classList.remove('text-gray-500');
                stepText.classList.add('text-primary');
            } else {
                stepCircle.classList.remove('bg-primary', 'text-white');
                stepCircle.classList.add('bg-gray-200', 'text-gray-500');
                stepText.classList.remove('text-primary');
                stepText.classList.add('text-gray-500');
            }

            if (stepLine && i < this.currentStep) {
                stepLine.classList.remove('bg-gray-200');
                stepLine.classList.add('bg-primary');
            } else if (stepLine) {
                stepLine.classList.remove('bg-primary');
                stepLine.classList.add('bg-gray-200');
            }
        }
    }

    validateCurrentStep() {
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        const requiredFields = currentStepElement.querySelectorAll('input[required], select[required]');
        let isValid = true;
        let firstErrorField = null;

        // 기존 에러 메시지 제거
        currentStepElement.querySelectorAll('.error-message').forEach(error => {
            error.remove();
        });

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field, '필수 항목입니다.');
                isValid = false;
                if (!firstErrorField) {
                    firstErrorField = field;
                }
            } else {
                // 개별 필드 유효성 검사
                if (field.type === 'email' && !this.isValidEmail(field.value)) {
                    this.showFieldError(field, '올바른 이메일 형식이 아닙니다.');
                    isValid = false;
                    if (!firstErrorField) firstErrorField = field;
                }
                
                if (field.type === 'password' && field.value.length < 8) {
                    this.showFieldError(field, '비밀번호는 8자리 이상이어야 합니다.');
                    isValid = false;
                    if (!firstErrorField) firstErrorField = field;
                }
            }
        });

        // 추가 유효성 검사
        if (this.currentStep === 2) {
            if (!this.validateSalaryRange()) {
                isValid = false;
            }
        }

        if (!isValid && firstErrorField) {
            firstErrorField.focus();
            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        return isValid;
    }

    validateEmail(field) {
        if (field.value && !this.isValidEmail(field.value)) {
            this.showFieldError(field, '올바른 이메일 형식이 아닙니다.');
            return false;
        } else {
            this.clearFieldError(field);
            return true;
        }
    }

    validatePassword(field) {
        const password = field.value;
        let message = '';
        
        if (password.length < 8) {
            message = '비밀번호는 8자리 이상이어야 합니다.';
        } else if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
            message = '영문과 숫자를 포함해주세요.';
        }

        if (message) {
            this.showFieldError(field, message);
            return false;
        } else {
            this.clearFieldError(field);
            return true;
        }
    }

    validatePhone(field) {
        const phone = field.value.replace(/[^0-9+\-\s]/g, '');
        if (field.value && phone.length < 10) {
            this.showFieldError(field, '올바른 전화번호를 입력해주세요.');
            return false;
        } else {
            this.clearFieldError(field);
            return true;
        }
    }

    validateSalaryRange() {
        const minSalary = document.getElementById('desired_salary_min');
        const maxSalary = document.getElementById('desired_salary_max');
        
        if (minSalary.value && maxSalary.value) {
            if (parseInt(minSalary.value) > parseInt(maxSalary.value)) {
                this.showFieldError(maxSalary, '최대 급여가 최소 급여보다 작을 수 없습니다.');
                return false;
            }
        }
        
        this.clearFieldError(minSalary);
        this.clearFieldError(maxSalary);
        return true;
    }

    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    showFieldError(field, message) {
        this.clearFieldError(field);
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-red-500 text-sm mt-1';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle mr-1"></i>${message}`;
        
        field.classList.add('border-red-500', 'focus:border-red-500');
        field.parentNode.appendChild(errorDiv);
    }

    clearFieldError(field) {
        field.classList.remove('border-red-500', 'focus:border-red-500');
        const errorMessage = field.parentNode.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.remove();
        }
    }

    saveCurrentStepData() {
        const currentStepElement = document.getElementById(`step-${this.currentStep}`);
        const inputs = currentStepElement.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            this.formData[input.name] = input.value;
        });
    }

    async submitForm() {
        if (!this.validateCurrentStep()) {
            return;
        }

        this.saveCurrentStepData();
        
        try {
            // 로딩 상태 표시
            const submitBtn = document.getElementById('submit-btn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>등록 중...';
            submitBtn.disabled = true;

            // 급여를 원 단위로 변환 (만원 → 원)
            if (this.formData.desired_salary_min) {
                this.formData.desired_salary_min = parseInt(this.formData.desired_salary_min) * 10000;
            }
            if (this.formData.desired_salary_max) {
                this.formData.desired_salary_max = parseInt(this.formData.desired_salary_max) * 10000;
            }

            // 상태를 active로 설정
            this.formData.status = 'active';

            console.log('제출할 데이터:', this.formData);

            // API 호출
            const response = await axios.post('/api/job-seekers/register', this.formData);

            if (response.data.success) {
                this.showSuccessModal();
            } else {
                throw new Error(response.data.error || '등록 중 오류가 발생했습니다.');
            }

        } catch (error) {
            console.error('등록 실패:', error);
            
            let errorMessage = '등록 중 오류가 발생했습니다.';
            if (error.response && error.response.data && error.response.data.error) {
                errorMessage = error.response.data.error;
            }
            
            this.showError(errorMessage);
            
            // 버튼 상태 복원
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    showSuccessModal() {
        const modal = document.getElementById('success-modal');
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideSuccessModal() {
        const modal = document.getElementById('success-modal');
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }

    resetForm() {
        this.hideSuccessModal();
        this.currentStep = 1;
        this.formData = {};
        document.getElementById('job-seeker-form').reset();
        
        // 모든 에러 메시지 제거
        document.querySelectorAll('.error-message').forEach(error => {
            error.remove();
        });
        
        // 모든 필드 에러 스타일 제거
        document.querySelectorAll('.border-red-500').forEach(field => {
            field.classList.remove('border-red-500', 'focus:border-red-500');
        });
        
        this.updateUI();
    }

    showError(message) {
        // 간단한 에러 알림 (실제 환경에서는 토스트 메시지나 모달 사용)
        alert('❌ ' + message);
    }

    showSuccess(message) {
        // 간단한 성공 알림
        alert('✅ ' + message);
    }
}

// 페이지 로드시 초기화
let jobSeekerRegistration;
document.addEventListener('DOMContentLoaded', () => {
    jobSeekerRegistration = new JobSeekerRegistration();
});