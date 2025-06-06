// Admin CMS Integration Configuration
const ADMIN_CMS_CONFIG = {
    apiUrl: 'http://localhost:1337',
    endpoints: {
        upload: '/api/upload',
        medicalTasks: '/api/medical-tasks',
        users: '/api/users'
    }
};

class AdminMedicalTaskManager {
    constructor() {
        this.apiUrl = ADMIN_CMS_CONFIG.apiUrl;
        this.token = localStorage.getItem('adminToken');
        this.validateAdminAccess();
    }

    // Validate admin access
    validateAdminAccess() {
        if (!this.token) {
            window.location.href = 'admin-login.html';
            throw new Error('Admin authentication required');
        }
    }

    getHeaders() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    // Upload multiple medical audio files with metadata
    async uploadBulkMedicalFiles(files, metadata) {
        try {
            // First, upload the audio files
            const formData = new FormData();
            files.forEach((file) => {
                formData.append('files', file);
            });

            const uploadResponse = await fetch(`${this.apiUrl}${ADMIN_CMS_CONFIG.endpoints.upload}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (!uploadResponse.ok) {
                throw new Error('File upload failed');
            }

            const uploadedFiles = await uploadResponse.json();

            // Create medical transcription tasks for each uploaded file
            const tasks = await Promise.all(uploadedFiles.map(async (file, index) => {
                const taskMetadata = metadata[index] || {};
                const taskData = {
                    data: {
                        title: taskMetadata.title || `Medical Transcription - ${file.name}`,
                        description: taskMetadata.description || 'Medical transcription task',
                        audioFile: file.id,
                        status: 'available',
                        type: 'medical',
                        priority: taskMetadata.priority || 'medium',
                        specialization: taskMetadata.specialization || 'General',
                        estimatedDuration: taskMetadata.estimatedDuration || 30,
                        deadline: taskMetadata.deadline || this.calculateDefaultDeadline(),
                        paymentRate: taskMetadata.paymentRate || 0,
                        confidentialityLevel: taskMetadata.confidentialityLevel || 'standard',
                        medicalField: taskMetadata.medicalField || 'General Medicine',
                        requiredQualifications: taskMetadata.requiredQualifications || [],
                        assignedTo: null
                    }
                };

                const taskResponse = await fetch(`${this.apiUrl}${ADMIN_CMS_CONFIG.endpoints.medicalTasks}`, {
                    method: 'POST',
                    headers: this.getHeaders(),
                    body: JSON.stringify(taskData)
                });

                if (!taskResponse.ok) {
                    throw new Error(`Failed to create task for file: ${file.name}`);
                }

                return taskResponse.json();
            }));

            return {
                success: true,
                uploadedFiles: uploadedFiles,
                createdTasks: tasks
            };
        } catch (error) {
            console.error('Error in bulk medical upload:', error);
            throw error;
        }
    }

    // Get all medical transcription tasks
    async getAllMedicalTasks() {
        try {
            const response = await fetch(`${this.apiUrl}${ADMIN_CMS_CONFIG.endpoints.medicalTasks}`, {
                headers: this.getHeaders()
            });

            if (!response.ok) throw new Error('Failed to fetch medical tasks');
            return await response.json();
        } catch (error) {
            console.error('Error fetching medical tasks:', error);
            throw error;
        }
    }

    // Update task status
    async updateTaskStatus(taskId, status, notes) {
        try {
            const response = await fetch(`${this.apiUrl}${ADMIN_CMS_CONFIG.endpoints.medicalTasks}/${taskId}`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    data: {
                        status: status,
                        adminNotes: notes,
                        lastUpdated: new Date().toISOString()
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to update task status');
            return await response.json();
        } catch (error) {
            console.error('Error updating task status:', error);
            throw error;
        }
    }

    // Delete a task
    async deleteTask(taskId) {
        try {
            const response = await fetch(`${this.apiUrl}${ADMIN_CMS_CONFIG.endpoints.medicalTasks}/${taskId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            if (!response.ok) throw new Error('Failed to delete task');
            return true;
        } catch (error) {
            console.error('Error deleting task:', error);
            throw error;
        }
    }

    // Helper method to calculate default deadline (7 days from now)
    calculateDefaultDeadline() {
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + 7);
        return deadline.toISOString();
    }

    // Get task statistics
    async getTaskStatistics() {
        try {
            const tasks = await this.getAllMedicalTasks();
            return {
                total: tasks.data.length,
                available: tasks.data.filter(t => t.attributes.status === 'available').length,
                inProgress: tasks.data.filter(t => t.attributes.status === 'in_progress').length,
                completed: tasks.data.filter(t => t.attributes.status === 'completed').length,
                urgent: tasks.data.filter(t => t.attributes.priority === 'high').length
            };
        } catch (error) {
            console.error('Error getting task statistics:', error);
            throw error;
        }
    }
}

// UI Class for Admin Medical Task Management
class AdminMedicalTaskUI {
    constructor() {
        this.taskManager = new AdminMedicalTaskManager();
        this.uploadQueue = [];
        this.initializeUI();
    }

    initializeUI() {
        this.createUploadForm();
        this.initializeEventListeners();
        this.updateTaskStatistics();
    }

    createUploadForm() {
        const uploadForm = document.createElement('div');
        uploadForm.className = 'admin-upload-form';
        uploadForm.innerHTML = `
            <div class="upload-section">
                <h2>Upload Medical Transcription Tasks</h2>
                <div class="upload-area" id="uploadArea">
                    <input type="file" multiple accept="audio/*" id="audioFileInput" style="display: none;">
                    <button class="upload-button" onclick="document.getElementById('audioFileInput').click()">
                        <i class="fas fa-upload"></i> Select Audio Files
                    </button>
                    <p class="upload-hint">Drag and drop audio files here or click to select</p>
                </div>
                <div class="upload-queue" id="uploadQueue"></div>
                <div class="upload-controls">
                    <button id="startUpload" class="primary-button" disabled>
                        Start Upload
                    </button>
                    <button id="clearQueue" class="secondary-button" disabled>
                        Clear Queue
                    </button>
                </div>
            </div>
            <div class="task-statistics" id="taskStatistics">
                <h3>Task Statistics</h3>
                <div class="stats-grid"></div>
            </div>
        `;

        document.querySelector('.admin-content').appendChild(uploadForm);
    }

    initializeEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('audioFileInput');
        const startUploadBtn = document.getElementById('startUpload');
        const clearQueueBtn = document.getElementById('clearQueue');

        fileInput.addEventListener('change', (e) => this.handleFileSelection(e.target.files));
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFileSelection(e.dataTransfer.files);
        });

        startUploadBtn.addEventListener('click', () => this.startUpload());
        clearQueueBtn.addEventListener('click', () => this.clearQueue());
    }

    handleFileSelection(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('audio/')) {
                this.uploadQueue.push({
                    file: file,
                    metadata: {
                        title: `Medical Transcription - ${file.name}`,
                        specialization: 'General',
                        priority: 'medium',
                        estimatedDuration: 30
                    }
                });
            }
        });

        this.updateUploadQueue();
        this.toggleUploadControls();
    }

    updateUploadQueue() {
        const queueElement = document.getElementById('uploadQueue');
        queueElement.innerHTML = this.uploadQueue.map((item, index) => `
            <div class="queue-item">
                <span class="file-name">${item.file.name}</span>
                <div class="metadata-fields">
                    <input type="text" 
                           placeholder="Title" 
                           value="${item.metadata.title}"
                           onchange="adminUI.updateMetadata(${index}, 'title', this.value)">
                    <select onchange="adminUI.updateMetadata(${index}, 'specialization', this.value)">
                        <option value="General" ${item.metadata.specialization === 'General' ? 'selected' : ''}>General</option>
                        <option value="Cardiology" ${item.metadata.specialization === 'Cardiology' ? 'selected' : ''}>Cardiology</option>
                        <option value="Neurology" ${item.metadata.specialization === 'Neurology' ? 'selected' : ''}>Neurology</option>
                        <option value="Orthopedics" ${item.metadata.specialization === 'Orthopedics' ? 'selected' : ''}>Orthopedics</option>
                    </select>
                    <select onchange="adminUI.updateMetadata(${index}, 'priority', this.value)">
                        <option value="low" ${item.metadata.priority === 'low' ? 'selected' : ''}>Low Priority</option>
                        <option value="medium" ${item.metadata.priority === 'medium' ? 'selected' : ''}>Medium Priority</option>
                        <option value="high" ${item.metadata.priority === 'high' ? 'selected' : ''}>High Priority</option>
                    </select>
                    <input type="number" 
                           placeholder="Duration (minutes)" 
                           value="${item.metadata.estimatedDuration}"
                           onchange="adminUI.updateMetadata(${index}, 'estimatedDuration', this.value)">
                </div>
                <button onclick="adminUI.removeFromQueue(${index})">Remove</button>
            </div>
        `).join('');
    }

    updateMetadata(index, field, value) {
        if (this.uploadQueue[index]) {
            this.uploadQueue[index].metadata[field] = value;
        }
    }

    removeFromQueue(index) {
        this.uploadQueue.splice(index, 1);
        this.updateUploadQueue();
        this.toggleUploadControls();
    }

    toggleUploadControls() {
        const startUploadBtn = document.getElementById('startUpload');
        const clearQueueBtn = document.getElementById('clearQueue');
        const hasFiles = this.uploadQueue.length > 0;

        startUploadBtn.disabled = !hasFiles;
        clearQueueBtn.disabled = !hasFiles;
    }

    clearQueue() {
        this.uploadQueue = [];
        this.updateUploadQueue();
        this.toggleUploadControls();
    }

    async startUpload() {
        const startUploadBtn = document.getElementById('startUpload');
        startUploadBtn.disabled = true;

        try {
            const files = this.uploadQueue.map(item => item.file);
            const metadata = this.uploadQueue.map(item => item.metadata);

            const result = await this.taskManager.uploadBulkMedicalFiles(files, metadata);
            
            alert(`Successfully uploaded ${result.createdTasks.length} medical transcription tasks!`);
            this.clearQueue();
            this.updateTaskStatistics();
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload files. Please try again.');
        } finally {
            startUploadBtn.disabled = false;
        }
    }

    async updateTaskStatistics() {
        try {
            const stats = await this.taskManager.getTaskStatistics();
            const statsGrid = document.querySelector('.stats-grid');
            statsGrid.innerHTML = `
                <div class="stat-item">
                    <h4>Total Tasks</h4>
                    <span>${stats.total}</span>
                </div>
                <div class="stat-item">
                    <h4>Available</h4>
                    <span>${stats.available}</span>
                </div>
                <div class="stat-item">
                    <h4>In Progress</h4>
                    <span>${stats.inProgress}</span>
                </div>
                <div class="stat-item">
                    <h4>Completed</h4>
                    <span>${stats.completed}</span>
                </div>
                <div class="stat-item">
                    <h4>Urgent</h4>
                    <span>${stats.urgent}</span>
                </div>
            `;
        } catch (error) {
            console.error('Error updating statistics:', error);
        }
    }
}

// Export the classes
export { AdminMedicalTaskManager, AdminMedicalTaskUI }; 