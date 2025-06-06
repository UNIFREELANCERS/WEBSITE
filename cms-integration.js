// CMS Integration Configuration
const CMS_CONFIG = {
    apiUrl: 'http://localhost:1337', // Default Strapi URL
    endpoints: {
        audioFiles: '/api/audio-files',
        transcriptions: '/api/transcriptions',
        tasks: '/api/tasks',
        academicTasks: '/api/academic-tasks',
        medicalTasks: '/api/medical-tasks'
    }
};

// Audio File Management
class AudioFileManager {
    constructor() {
        this.apiUrl = CMS_CONFIG.apiUrl;
        this.currentUser = JSON.parse(localStorage.getItem('userData')) || {};
        this.token = localStorage.getItem('strapiToken');
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Upload multiple audio files with task type (academic or medical)
    async uploadBulkAudioFiles(files, taskType, taskDetails) {
        try {
            // First upload the audio files
            const formData = new FormData();
            files.forEach((file) => {
                formData.append('files', file);
            });
            formData.append('ref', 'api::audio-file.audio-file');

            const uploadResponse = await fetch(`${this.apiUrl}/upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('Upload failed');
            }

            const uploadedFiles = await uploadResponse.json();

            // Create tasks for each uploaded file
            const tasks = await Promise.all(uploadedFiles.map(async (file) => {
                const taskData = {
                    data: {
                        title: taskDetails.title || `Transcription Task - ${file.name}`,
                        description: taskDetails.description || `Transcribe the audio file: ${file.name}`,
                        audioFile: file.id,
                        status: 'available',
                        type: taskType,
                        priority: taskDetails.priority || 'medium',
                        deadline: taskDetails.deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                        estimatedDuration: taskDetails.estimatedDuration || 30,
                        assignedTo: null
                    }
                };

                const endpoint = taskType === 'academic' ? 
                    CMS_CONFIG.endpoints.academicTasks : 
                    CMS_CONFIG.endpoints.medicalTasks;

                const taskResponse = await fetch(`${this.apiUrl}${endpoint}`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(taskData)
                });

                if (!taskResponse.ok) {
                    throw new Error('Failed to create task');
                }

                return taskResponse.json();
            }));

            return tasks;
        } catch (error) {
            console.error('Error in bulk upload:', error);
            throw error;
        }
    }

    // Get available academic tasks
    async getAvailableAcademicTasks() {
        try {
            const response = await fetch(
                `${this.apiUrl}${CMS_CONFIG.endpoints.academicTasks}?filters[status][$eq]=available&filters[assignedTo][$null]=true`,
                { headers: this.getHeaders() }
            );
            if (!response.ok) throw new Error('Failed to fetch academic tasks');
            return await response.json();
        } catch (error) {
            console.error('Error fetching academic tasks:', error);
            throw error;
        }
    }

    // Get available medical tasks
    async getAvailableMedicalTasks() {
        try {
            const response = await fetch(
                `${this.apiUrl}${CMS_CONFIG.endpoints.medicalTasks}?filters[status][$eq]=available&filters[assignedTo][$null]=true`,
                { headers: this.getHeaders() }
            );
            if (!response.ok) throw new Error('Failed to fetch medical tasks');
            return await response.json();
        } catch (error) {
            console.error('Error fetching medical tasks:', error);
            throw error;
        }
    }

    // Accept a task (academic or medical)
    async acceptTask(taskId, taskType) {
        try {
            const endpoint = taskType === 'academic' ? 
                CMS_CONFIG.endpoints.academicTasks : 
                CMS_CONFIG.endpoints.medicalTasks;

            const response = await fetch(`${this.apiUrl}${endpoint}/${taskId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    data: {
                        status: 'in_progress',
                        assignedTo: this.currentUser.id,
                        assignedAt: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to accept task');
            return await response.json();
        } catch (error) {
            console.error('Error accepting task:', error);
            throw error;
        }
    }

    // Get user's assigned tasks
    async getUserTasks() {
        try {
            const [academicTasks, medicalTasks] = await Promise.all([
                fetch(`${this.apiUrl}${CMS_CONFIG.endpoints.academicTasks}?filters[assignedTo][id][$eq]=${this.currentUser.id}`, 
                    { headers: this.getHeaders() }).then(res => res.json()),
                fetch(`${this.apiUrl}${CMS_CONFIG.endpoints.medicalTasks}?filters[assignedTo][id][$eq]=${this.currentUser.id}`, 
                    { headers: this.getHeaders() }).then(res => res.json())
            ]);

            return {
                academicTasks: academicTasks.data || [],
                medicalTasks: medicalTasks.data || []
            };
        } catch (error) {
            console.error('Error fetching user tasks:', error);
            throw error;
        }
    }

    // Submit a completed transcription
    async submitTranscription(taskId, taskType, transcriptionText) {
        try {
            const endpoint = taskType === 'academic' ? 
                CMS_CONFIG.endpoints.academicTasks : 
                CMS_CONFIG.endpoints.medicalTasks;

            const response = await fetch(`${this.apiUrl}${endpoint}/${taskId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    data: {
                        status: 'completed',
                        transcription: transcriptionText,
                        completedAt: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to submit transcription');
            return await response.json();
        } catch (error) {
            console.error('Error submitting transcription:', error);
            throw error;
        }
    }
}

// Export the AudioFileManager class
export default AudioFileManager;

// UI Components for Audio Management
class AudioManagementUI {
    constructor() {
        this.audioManager = new AudioFileManager();
        this.initializeUI();
    }

    initializeUI() {
        // Create upload section
        const uploadSection = document.createElement('div');
        uploadSection.className = 'upload-section';
        uploadSection.innerHTML = `
            <h2>Upload Audio Files</h2>
            <div class="upload-area" id="uploadArea">
                <input type="file" multiple accept="audio/*" id="audioFileInput" style="display: none;">
                <button class="upload-button" onclick="document.getElementById('audioFileInput').click()">
                    <i class="fas fa-upload"></i> Select Audio Files
                </button>
                <p class="upload-hint">Drag and drop audio files here or click to select</p>
            </div>
            <div class="upload-progress" id="uploadProgress" style="display: none;">
                <div class="progress-bar"></div>
                <p class="progress-text">Uploading...</p>
            </div>
        `;

        // Create available tasks section
        const availableTasksSection = document.createElement('div');
        availableTasksSection.className = 'files-list-section';
        availableTasksSection.innerHTML = `
            <h2>Available Transcription Tasks</h2>
            <div class="files-list" id="availableTasksList"></div>
        `;

        // Create my tasks section
        const myTasksSection = document.createElement('div');
        myTasksSection.className = 'files-list-section';
        myTasksSection.innerHTML = `
            <h2>My Transcription Tasks</h2>
            <div class="files-list" id="myTasksList"></div>
        `;

        // Add sections to the page
        document.querySelector('.content').appendChild(uploadSection);
        document.querySelector('.content').appendChild(availableTasksSection);
        document.querySelector('.content').appendChild(myTasksSection);

        // Initialize event listeners
        this.initializeEventListeners();
        
        // Load initial data
        this.updateAvailableTasks();
        this.updateMyTasks();
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('audioFileInput');

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Handle drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileUpload(e.dataTransfer.files);
        });
    }

    async handleFileUpload(files) {
        const progressBar = document.getElementById('uploadProgress');
        progressBar.style.display = 'block';

        try {
            const result = await this.audioManager.uploadBulkAudioFiles(files, 'academic', { title: 'New Academic Task', description: 'Transcribe the audio file', priority: 'medium' });
            this.updateAvailableTasks();
            alert('Files uploaded successfully!');
        } catch (error) {
            alert('Error uploading files. Please try again.');
        } finally {
            progressBar.style.display = 'none';
        }
    }

    async updateAvailableTasks() {
        const tasksList = document.getElementById('availableTasksList');
        try {
            const files = await this.audioManager.getAvailableAcademicTasks();
            if (files.length === 0) {
                tasksList.innerHTML = '<p class="no-tasks">No available transcription tasks at the moment.</p>';
                return;
            }
            
            tasksList.innerHTML = files.map(file => `
                <div class="file-item">
                    <i class="fas fa-file-audio"></i>
                    <span class="file-name">${file.title}</span>
                    <button class="accept-button" onclick="audioUI.acceptTask('${file.id}', 'academic')">
                        <i class="fas fa-check"></i> Accept Task
                    </button>
                </div>
            `).join('');
        } catch (error) {
            tasksList.innerHTML = '<p class="error">Error loading tasks</p>';
        }
    }

    async updateMyTasks() {
        const tasksList = document.getElementById('myTasksList');
        try {
            const tasks = await this.audioManager.getUserTasks();
            if (tasks.academicTasks.length === 0 && tasks.medicalTasks.length === 0) {
                tasksList.innerHTML = '<p class="no-tasks">You have no active transcription tasks.</p>';
                return;
            }
            
            tasksList.innerHTML = `
                <div class="file-item">
                    <i class="fas fa-file-audio"></i>
                    <span class="file-name">Academic Tasks</span>
                    <span class="task-status">${tasks.academicTasks.length} tasks</span>
                    <button class="transcribe-button" onclick="audioUI.startTranscription('academic')">
                        <i class="fas fa-microphone"></i> Transcribe
                    </button>
                </div>
                <div class="file-item">
                    <i class="fas fa-file-audio"></i>
                    <span class="file-name">Medical Tasks</span>
                    <span class="task-status">${tasks.medicalTasks.length} tasks</span>
                    <button class="transcribe-button" onclick="audioUI.startTranscription('medical')">
                        <i class="fas fa-microphone"></i> Transcribe
                    </button>
                </div>
            `;
        } catch (error) {
            tasksList.innerHTML = '<p class="error">Error loading your tasks</p>';
        }
    }

    async acceptTask(taskId, taskType) {
        try {
            await this.audioManager.acceptTask(taskId, taskType);
            // Update both lists
            this.updateAvailableTasks();
            this.updateMyTasks();
            alert('Task accepted successfully!');
        } catch (error) {
            alert('Error accepting task. Please try again.');
        }
    }

    async startTranscription(taskType) {
        try {
            const tasks = await this.audioManager.getUserTasks();
            if (taskType === 'academic') {
                if (tasks.academicTasks.length === 0) {
                    alert('No academic tasks available for transcription.');
                    return;
                }
                const task = tasks.academicTasks[0];
                const transcription = await this.audioManager.getTranscription(task.id);
                // Handle transcription result
                console.log('Transcription:', transcription);
            } else if (taskType === 'medical') {
                if (tasks.medicalTasks.length === 0) {
                    alert('No medical tasks available for transcription.');
                    return;
                }
                const task = tasks.medicalTasks[0];
                const transcription = await this.audioManager.getTranscription(task.id);
                // Handle transcription result
                console.log('Transcription:', transcription);
            }
        } catch (error) {
            alert('Error getting transcription. Please try again.');
        }
    }
}

// Initialize the UI when the page loads
let audioUI;
document.addEventListener('DOMContentLoaded', () => {
    audioUI = new AudioManagementUI();
}); 