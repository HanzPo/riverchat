<template>
  <div class="fixed inset-0 flex" style="background: var(--color-background);">
    <!-- Sidebar with Tabs -->
    <div class="w-64 border-r flex flex-col" style="border-color: var(--color-border); background: var(--color-background-secondary);">
      <!-- Back Button -->
      <div class="p-4 border-b" style="border-color: var(--color-border);">
        <button
          @click="handleBack"
          class="flex items-center gap-2 text-sm font-semibold hover:opacity-80 transition-opacity"
          style="color: var(--color-text-primary);"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
      </div>

      <!-- Tab List -->
      <div class="flex-1 p-4">
        <h2 class="text-xs font-bold uppercase tracking-wider mb-4" style="color: var(--color-text-tertiary);">
          Settings
        </h2>
        <div class="space-y-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="w-full text-left px-4 py-3 rounded-lg transition-all text-sm font-semibold"
            :class="activeTab === tab.id ? 'text-primary border border-primary' : 'text-secondary hover:bg-white/5 border border-transparent'"
            :style="activeTab === tab.id ? 'background: var(--color-primary);' : ''"
          >
            <span :style="activeTab === tab.id ? 'color: var(--color-background);' : ''">
              {{ tab.name }}
            </span>
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- API Keys Tab -->
      <div v-if="activeTab === 'api-keys'" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto p-8">
          <div class="max-w-2xl">
            <div class="mb-6">
              <label class="block mb-2 font-semibold text-sm" style="color: var(--color-text-secondary);">
                OpenRouter API Key
              </label>
              <input
                v-model="localApiKey"
                type="password"
                placeholder="sk-or-v1-..."
                class="input-material"
                @input="handleApiKeyChange"
              />
              <p class="text-xs mt-2" style="color: var(--color-text-tertiary);">
                Get your API key at <a href="https://openrouter.ai/keys" target="_blank" class="underline font-semibold" style="color: var(--color-primary);" rel="noopener noreferrer">openrouter.ai/keys</a>
              </p>
            </div>

            <div class="rounded-lg p-4 mb-6" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
              <p class="text-xs leading-relaxed font-medium mb-2" style="color: var(--color-text-primary);">
                🔒 Your API key is encrypted and synced with your account
              </p>
              <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
                💡 If no API key is provided, a shared key will be used with access to free models only
              </p>
            </div>

            <div v-if="isUsingSharedKey" class="rounded-lg p-4" style="background: var(--color-warning-bg); border: 1px solid var(--color-warning);">
              <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
                ⚠️ Currently using shared API key - only free models are available. Add your own key to access all models.
              </p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="p-6 border-t flex justify-end gap-3" style="border-color: var(--color-border); background: var(--color-background-secondary);">
          <button
            @click="handleUndoApiKey"
            :disabled="!hasApiKeyChanges"
            class="btn-material px-6 py-2.5"
            :style="!hasApiKeyChanges ? 'opacity: 0.5; cursor: not-allowed;' : ''"
          >
            Undo Changes
          </button>
          <button
            @click="handleSaveApiKey"
            :disabled="!hasApiKeyChanges || isSaving"
            class="btn-material px-6 py-2.5 font-semibold flex items-center gap-3"
            :style="(!hasApiKeyChanges || isSaving) ? 'opacity: 0.5; cursor: not-allowed;' : 'background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);'"
          >
            <div v-if="isSaving" class="loading-spinner-small"></div>
            <span>{{ isSaving ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </div>

      <!-- Enabled Models Tab -->
      <div v-if="activeTab === 'enabled-models'" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto p-8">
          <!-- Filters -->
          <div class="mb-6 rounded-lg" style="background: var(--color-background); border: 1px solid var(--color-border);">
            <!-- Filter Header -->
            <div class="p-4 border-b flex items-center justify-between" style="border-color: var(--color-border);">
              <div class="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-primary);">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                </svg>
                <h3 class="text-sm font-bold" style="color: var(--color-text-primary);">
                  Filters & Search
                </h3>
              </div>
              <button
                @click="resetFilters"
                class="text-xs font-semibold px-3 py-1.5 rounded-md transition-all reset-button"
                style="color: var(--color-text-tertiary); border: 1px solid var(--color-border);"
                title="Reset all filters"
              >
                Reset
              </button>
            </div>

            <div class="p-4 space-y-4">
              <!-- Search Bar -->
              <div>
                <input
                  v-model="filters.search"
                  type="text"
                  placeholder="Search models by name, ID, or description..."
                  class="input-material"
                  style="font-size: 14px;"
                />
              </div>

              <!-- Filter Row -->
              <div class="grid grid-cols-3 gap-3">
                <!-- Provider Filter -->
                <div>
                  <label class="mb-1.5 font-semibold text-xs flex items-center gap-1.5" style="color: var(--color-text-tertiary);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    Provider
                  </label>
                  <select v-model="filters.provider" class="input-material text-sm">
                    <option value="">All Providers</option>
                    <option v-for="provider in uniqueProviders" :key="provider" :value="provider">
                      {{ provider }}
                    </option>
                  </select>
                </div>

                <!-- Pricing Filter -->
                <div>
                  <label class="mb-1.5 font-semibold text-xs flex items-center gap-1.5" style="color: var(--color-text-tertiary);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="6" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    Pricing
                  </label>
                  <select v-model="filters.pricingType" class="input-material text-sm">
                    <option value="">All Models</option>
                    <option value="free">Free Only</option>
                    <option value="paid">Paid Only</option>
                  </select>
                </div>

                <!-- Sort By -->
                <div>
                  <label class="mb-1.5 font-semibold text-xs flex items-center gap-1.5" style="color: var(--color-text-tertiary);">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <polyline points="19 12 12 19 5 12"/>
                    </svg>
                    Sort By
                  </label>
                  <select v-model="filters.sortBy" class="input-material text-sm">
                    <option value="name">Name (A-Z)</option>
                    <option value="provider">Provider</option>
                    <option value="context">Context Length</option>
                    <option value="price">Price (Low to High)</option>
                  </select>
                </div>
              </div>

              <!-- Quick Actions -->
              <div class="flex gap-2 pt-3 border-t" style="border-color: var(--color-border);">
                <button
                  @click="selectAllFiltered"
                  class="btn-material px-3 py-1.5 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Select All
                </button>
                <button
                  @click="deselectAllFiltered"
                  class="btn-material px-3 py-1.5 text-xs font-semibold flex-1 flex items-center justify-center gap-1.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Deselect All
                </button>
              </div>
            </div>
          </div>

          <!-- Model Count -->
          <div class="mb-4 flex items-center justify-between">
            <p class="text-sm font-medium" style="color: var(--color-text-secondary);">
              Showing {{ filteredModels.length }} of {{ availableModels.length }} models
              • {{ enabledCount }} enabled
            </p>
          </div>

          <!-- Model Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="model in filteredModels"
              :key="model.id"
              class="p-4 rounded-lg border-2 transition-all relative group"
              :class="localEnabledModels[model.id] ? 'border-primary bg-primary/10' : 'border-white/10 bg-white/5 hover:border-white/20'"
            >
              <!-- Info Button -->
              <button
                @click.stop="showModelDetails(model)"
                class="absolute top-3 right-3 p-1.5 rounded-md transition-all opacity-60 hover:opacity-100"
                style="background: var(--color-background); border: 1px solid var(--color-border);"
                title="View details"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </button>

              <div class="flex items-start gap-3 cursor-pointer" @click="toggleModel(model.id)">
                <input
                  type="checkbox"
                  :checked="localEnabledModels[model.id]"
                  class="w-4 h-4 rounded mt-1 flex-shrink-0"
                  style="accent-color: var(--color-primary);"
                  @click.stop="toggleModel(model.id)"
                />
                <div class="flex-1 min-w-0 pr-8">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 class="text-sm font-bold truncate" style="color: var(--color-text-primary);">
                      {{ model.name }}
                    </h4>
                    <span v-if="model.isFree" class="text-xs font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                      FREE
                    </span>
                  </div>
                  <p class="text-xs mb-2 truncate" style="color: var(--color-text-tertiary);">
                    {{ model.id }}
                  </p>
                  <p v-if="model.description" class="text-xs mb-2 line-clamp-2" style="color: var(--color-text-secondary);">
                    {{ model.description }}
                  </p>
                  <div class="flex flex-wrap gap-2 text-xs" style="color: var(--color-text-tertiary);">
                    <span>📝 {{ formatContextLength(model.contextLength) }}</span>
                    <span v-if="!model.isFree">💰 ${{ formatPrice(model.pricing.prompt) }}/${{ formatPrice(model.pricing.completion) }}</span>
                    <span>🏢 {{ model.provider }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="filteredModels.length === 0" class="col-span-2 text-center py-12">
              <p class="text-sm" style="color: var(--color-text-tertiary);">
                No models found matching your filters
              </p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="p-6 border-t flex justify-end gap-3" style="border-color: var(--color-border); background: var(--color-background-secondary);">
          <button
            @click="handleUndoModels"
            :disabled="!hasModelChanges"
            class="btn-material px-6 py-2.5"
            :style="!hasModelChanges ? 'opacity: 0.5; cursor: not-allowed;' : ''"
          >
            Undo Changes
          </button>
          <button
            @click="handleSaveModels"
            :disabled="!hasModelChanges || isSaving"
            class="btn-material px-6 py-2.5 font-semibold flex items-center gap-3"
            :style="(!hasModelChanges || isSaving) ? 'opacity: 0.5; cursor: not-allowed;' : 'background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);'"
          >
            <div v-if="isSaving" class="loading-spinner-small"></div>
            <span>{{ isSaving ? 'Saving...' : 'Save Changes' }}</span>
          </button>
        </div>
      </div>

      <!-- Data Tab -->
      <div v-if="activeTab === 'data'" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto p-8">
          <div class="max-w-2xl">
            <!-- Model List Section -->
            <div class="mb-8">
              <h2 class="text-lg font-bold mb-4" style="color: var(--color-text-primary);">
                Model List
              </h2>
              
              <!-- Last Refresh Info -->
              <div class="rounded-lg p-4 mb-4" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-semibold" style="color: var(--color-text-secondary);">Last Refreshed</span>
                  <span class="text-sm font-mono" style="color: var(--color-text-primary);">
                    {{ formatLastRefresh() }}
                  </span>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-semibold" style="color: var(--color-text-secondary);">Available Models</span>
                  <span class="text-sm font-bold" style="color: var(--color-primary);">
                    {{ availableModels.length }}
                  </span>
                </div>
              </div>

              <!-- Refresh Button -->
              <button
                @click="handleRefreshModels"
                :disabled="isRefreshingModels"
                class="btn-material px-6 py-3 font-semibold w-full flex items-center justify-center gap-2"
                :style="isRefreshingModels ? 'opacity: 0.6; cursor: not-allowed;' : 'background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);'"
              >
                <svg 
                  v-if="!isRefreshingModels"
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                <svg 
                  v-if="isRefreshingModels"
                  class="animate-spin"
                  width="18" 
                  height="18" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="2"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                {{ isRefreshingModels ? 'Refreshing Models...' : 'Refresh Model List' }}
              </button>

              <!-- Info Notice -->
              <div class="rounded-lg p-4 mt-4" style="background: var(--color-info-bg); border: 1px solid var(--color-info);">
                <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
                  💡 The model list is cached to improve performance. Click the refresh button to fetch the latest models from OpenRouter.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Account Tab -->
      <div v-if="activeTab === 'account'" class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto p-8">
          <div class="max-w-2xl">
            <!-- Account Info Section -->
            <div v-if="currentUser" class="mb-8">
              <h2 class="text-lg font-bold mb-4" style="color: var(--color-text-primary);">
                Account Information
              </h2>
              
              <div class="rounded-lg p-4 mb-4" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
                <div class="flex items-center justify-between mb-3">
                  <span class="text-sm font-semibold" style="color: var(--color-text-tertiary);">Email</span>
                  <span class="text-sm font-medium" style="color: var(--color-text-primary);">
                    {{ currentUser.email || 'Not available' }}
                  </span>
                </div>
                <div v-if="currentUser.displayName" class="flex items-center justify-between">
                  <span class="text-sm font-semibold" style="color: var(--color-text-tertiary);">Display Name</span>
                  <span class="text-sm font-medium" style="color: var(--color-text-primary);">
                    {{ currentUser.displayName }}
                  </span>
                </div>
              </div>

              <div class="rounded-lg p-4 mb-6" style="background: var(--color-success-bg); border: 1px solid rgba(34, 197, 94, 0.3);">
                <p class="text-xs leading-relaxed font-medium" style="color: var(--color-text-primary);">
                  ✅ You are signed in. Your data is securely synced to the cloud.
                </p>
              </div>

              <!-- Sign Out Button -->
              <button
                @click="emit('logout')"
                :disabled="isAuthenticating"
                class="btn-material px-6 py-3 font-semibold w-full flex items-center justify-center gap-2"
                :style="isAuthenticating ? 'opacity: 0.6; cursor: not-allowed;' : 'background: var(--color-error); border-color: var(--color-error);'"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {{ isAuthenticating ? 'Signing out...' : 'Sign Out' }}
              </button>
            </div>

            <!-- Not Signed In -->
            <div v-else class="mb-8">
              <div class="rounded-lg p-6 text-center" style="background: var(--color-background-secondary); border: 1px solid var(--color-border);">
                <svg class="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--color-text-tertiary);">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <p class="text-sm font-medium mb-2" style="color: var(--color-text-primary);">
                  Not signed in
                </p>
                <p class="text-xs" style="color: var(--color-text-tertiary);">
                  Sign in to sync your data across devices
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Model Details Modal -->
    <div v-if="modelDetailsModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0, 0, 0, 0.7);" @click.self="closeModelDetails">
      <div class="card-material max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" style="background: var(--color-background-secondary);">
        <!-- Header -->
        <div class="p-6 border-b" style="border-color: var(--color-border);">
          <div class="flex justify-between items-start gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h2 class="text-xl font-bold" style="color: var(--color-text-primary);">
                  {{ modelDetailsModal.model?.name }}
                </h2>
                <span v-if="modelDetailsModal.model?.isFree" class="text-xs font-bold px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                  FREE
                </span>
              </div>
              <p class="text-sm font-mono" style="color: var(--color-text-tertiary);">
                {{ modelDetailsModal.model?.id }}
              </p>
            </div>
            <button
              @click="closeModelDetails"
              class="p-2 rounded-md hover:bg-white/10 transition-colors"
              style="color: var(--color-text-secondary);"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-6">
          <!-- Description -->
          <div v-if="modelDetailsModal.model?.description">
            <h3 class="text-sm font-bold uppercase tracking-wider mb-2" style="color: var(--color-text-tertiary);">
              Description
            </h3>
            <p class="text-sm leading-relaxed" style="color: var(--color-text-secondary);">
              {{ modelDetailsModal.model.description }}
            </p>
          </div>

          <!-- Specifications -->
          <div>
            <h3 class="text-sm font-bold uppercase tracking-wider mb-3" style="color: var(--color-text-tertiary);">
              Specifications
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg" style="background: var(--color-background); border: 1px solid var(--color-border);">
                <div class="text-xs font-semibold mb-1" style="color: var(--color-text-tertiary);">Provider</div>
                <div class="text-sm font-bold" style="color: var(--color-text-primary);">{{ modelDetailsModal.model?.provider }}</div>
              </div>
              <div class="p-3 rounded-lg" style="background: var(--color-background); border: 1px solid var(--color-border);">
                <div class="text-xs font-semibold mb-1" style="color: var(--color-text-tertiary);">Context Length</div>
                <div class="text-sm font-bold" style="color: var(--color-text-primary);">{{ formatContextLength(modelDetailsModal.model?.contextLength || 0) }} tokens</div>
              </div>
            </div>
          </div>

          <!-- Pricing -->
          <div v-if="!modelDetailsModal.model?.isFree">
            <h3 class="text-sm font-bold uppercase tracking-wider mb-3" style="color: var(--color-text-tertiary);">
              Pricing (per 1M tokens)
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-3 rounded-lg" style="background: var(--color-background); border: 1px solid var(--color-border);">
                <div class="text-xs font-semibold mb-1" style="color: var(--color-text-tertiary);">Prompt</div>
                <div class="text-sm font-bold text-green-400">${{ formatPrice(modelDetailsModal.model?.pricing.prompt || 0) }}</div>
              </div>
              <div class="p-3 rounded-lg" style="background: var(--color-background); border: 1px solid var(--color-border);">
                <div class="text-xs font-semibold mb-1" style="color: var(--color-text-tertiary);">Completion</div>
                <div class="text-sm font-bold text-green-400">${{ formatPrice(modelDetailsModal.model?.pricing.completion || 0) }}</div>
              </div>
            </div>
          </div>

          <!-- Free Model Notice -->
          <div v-if="modelDetailsModal.model?.isFree" class="p-4 rounded-lg" style="background: var(--color-success-bg); border: 1px solid rgba(34, 197, 94, 0.3);">
            <p class="text-sm font-medium" style="color: var(--color-text-primary);">
              ✨ This model is completely free to use! No API key required.
            </p>
          </div>

          <!-- Action Button -->
          <div class="pt-4 border-t" style="border-color: var(--color-border);">
            <button
              @click="toggleModelFromDetails"
              class="btn-material w-full py-3 font-semibold"
              :style="localEnabledModels[modelDetailsModal.model?.id || ''] ? 'background: var(--color-error); border-color: var(--color-error);' : 'background: var(--color-primary-muted); color: var(--color-primary); border-color: var(--color-primary);'"
            >
              {{ localEnabledModels[modelDetailsModal.model?.id || ''] ? 'Disable Model' : 'Enable Model' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Settings, LLMModel } from '../types';
import { SHARED_OPENROUTER_API_KEY, validateSelectedModels } from '../types';
import { getAvailableModels, filterModelsByApiKey, sortModels } from '../services/openrouter';

interface Props {
  settings: Settings;
  currentUser?: { uid: string; email: string | null; displayName: string | null } | null;
  isAuthenticating?: boolean;
}

interface Emits {
  (e: 'save', settings: Settings): void;
  (e: 'close'): void;
  (e: 'logout'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const tabs: Array<{ id: 'api-keys' | 'enabled-models' | 'data' | 'account'; name: string }> = [
  { id: 'enabled-models', name: 'Enabled Models' },
  { id: 'api-keys', name: 'API Key' },
  { id: 'data', name: 'Data' },
  { id: 'account', name: 'Account' },
];

const activeTab = ref<'api-keys' | 'enabled-models' | 'data' | 'account'>('enabled-models');

// API Key state
const localApiKey = ref(props.settings.apiKeys.openrouter || '');
const originalApiKey = ref(props.settings.apiKeys.openrouter || '');

// Models state
const availableModels = ref<LLMModel[]>([...(props.settings.availableModels || [])]);
const localEnabledModels = ref<Record<string, boolean>>({ ...props.settings.enabledModels });
const originalEnabledModels = ref<Record<string, boolean>>({ ...props.settings.enabledModels });

// Filters
const filters = ref({
  search: '',
  provider: '',
  pricingType: '', // 'free', 'paid', or ''
  sortBy: 'name' as 'name' | 'provider' | 'context' | 'price',
});

// Model details modal state
const modelDetailsModal = ref<{
  isOpen: boolean;
  model: LLMModel | null;
}>({
  isOpen: false,
  model: null,
});

// Data tab state
const isRefreshingModels = ref(false);
const isSaving = ref(false);

// Compute ranges from available models
// Not needed anymore - using fixed ranges

const uniqueProviders = computed(() => {
  const providers = new Set(availableModels.value.map(m => m.provider));
  return Array.from(providers).sort();
});

const isUsingSharedKey = computed(() => {
  return !localApiKey.value || localApiKey.value === SHARED_OPENROUTER_API_KEY;
});

const hasApiKeyChanges = computed(() => {
  return localApiKey.value !== originalApiKey.value;
});

const hasModelChanges = computed(() => {
  return JSON.stringify(localEnabledModels.value) !== JSON.stringify(originalEnabledModels.value);
});

const enabledCount = computed(() => {
  return Object.values(localEnabledModels.value).filter(v => v === true).length;
});

// Filtered and sorted models
const filteredModels = computed(() => {
  let models = [...availableModels.value];

  // Search filter
  if (filters.value.search.trim()) {
    const query = filters.value.search.toLowerCase();
    models = models.filter(m =>
      m.name.toLowerCase().includes(query) ||
      m.id.toLowerCase().includes(query) ||
      m.provider.toLowerCase().includes(query) ||
      (m.description && m.description.toLowerCase().includes(query))
    );
  }

  // Provider filter
  if (filters.value.provider) {
    models = models.filter(m => m.provider === filters.value.provider);
  }

  // Pricing type filter
  if (filters.value.pricingType === 'free') {
    models = models.filter(m => m.isFree);
  } else if (filters.value.pricingType === 'paid') {
    models = models.filter(m => !m.isFree);
  }

  // Sort
  models.sort((a, b) => {
    switch (filters.value.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'provider':
        return a.provider.localeCompare(b.provider) || a.name.localeCompare(b.name);
      case 'context':
        return b.contextLength - a.contextLength;
      case 'price':
        const aPrice = a.isFree ? 0 : Math.max(a.pricing.prompt, a.pricing.completion);
        const bPrice = b.isFree ? 0 : Math.max(b.pricing.prompt, b.pricing.completion);
        return aPrice - bPrice;
      default:
        return 0;
    }
  });

  return models;
});

// Not needed anymore - using fixed ranges

// Filter available models based on API key changes
function handleApiKeyChange() {
  const apiKey = localApiKey.value || SHARED_OPENROUTER_API_KEY;
  const filtered = filterModelsByApiKey(availableModels.value, apiKey);
  
  // Update available models to reflect filter
  availableModels.value = [...filtered];

  // Clean up enabled models - remove any that are no longer available
  const availableIds = new Set(filtered.map(m => m.id));
  const cleaned: Record<string, boolean> = {};
  Object.keys(localEnabledModels.value).forEach(id => {
    if (availableIds.has(id) && localEnabledModels.value[id]) {
      cleaned[id] = true;
    }
  });
  
  // If no models are enabled after cleaning, enable default models
  if (Object.keys(cleaned).length === 0 && filtered.length > 0) {
    // Try to enable the preferred default models
    const defaultModelIds = [
      'google/gemma-3n-e4b-it:free',
      'mistralai/mistral-7b-instruct:free',
      'moonshotai/kimi-k2:free',
      'openai/gpt-oss-20b:free',
    ];
    
    let enabledCount = 0;
    defaultModelIds.forEach(modelId => {
      const model = filtered.find(m => m.id === modelId);
      if (model) {
        cleaned[model.id] = true;
        enabledCount++;
      }
    });
    
    // Fallback: if none of the preferred models are available, enable first free model
    if (enabledCount === 0) {
      const defaultModel = filtered.find(m => m.isFree) || filtered[0];
      if (defaultModel) {
        cleaned[defaultModel.id] = true;
      }
    }
  }
  
  localEnabledModels.value = cleaned;
}

function toggleModel(modelId: string) {
  localEnabledModels.value[modelId] = !localEnabledModels.value[modelId];
}

function showModelDetails(model: LLMModel) {
  modelDetailsModal.value = {
    isOpen: true,
    model,
  };
}

function closeModelDetails() {
  modelDetailsModal.value = {
    isOpen: false,
    model: null,
  };
}

function toggleModelFromDetails() {
  if (modelDetailsModal.value.model) {
    toggleModel(modelDetailsModal.value.model.id);
  }
}

function selectAllFiltered() {
  filteredModels.value.forEach(model => {
    localEnabledModels.value[model.id] = true;
  });
}

function deselectAllFiltered() {
  filteredModels.value.forEach(model => {
    localEnabledModels.value[model.id] = false;
  });
}

function resetFilters() {
  filters.value = {
    search: '',
    provider: '',
    pricingType: '',
    sortBy: 'name',
  };
}

function formatContextLength(length: number): string {
  if (length >= 1000000) {
    return `${(length / 1000000).toFixed(1)}M`;
  } else if (length >= 1000) {
    return `${(length / 1000).toFixed(0)}K`;
  }
  return length.toString();
}

function formatPrice(price: number): string {
  if (price === 0) return '0';
  if (price < 0.01) return price.toFixed(4);
  if (price < 1) return price.toFixed(2);
  return price.toFixed(2);
}

function handleUndoApiKey() {
  localApiKey.value = originalApiKey.value;
  handleApiKeyChange();
}

async function handleSaveApiKey() {
  isSaving.value = true;
  try {
    // Check if API key changed before updating
    const apiKeyChanged = localApiKey.value !== originalApiKey.value;
    
    // Filter models based on new API key
    handleApiKeyChange();

    originalApiKey.value = localApiKey.value;
    originalEnabledModels.value = { ...localEnabledModels.value };
    
    // Validate and clean up lastChatSelectedModels based on available models
    let cleanedSelectedModels: LLMModel[] = [];
    if (props.settings.lastChatSelectedModels && props.settings.lastChatSelectedModels.length > 0) {
      cleanedSelectedModels = validateSelectedModels(
        props.settings.lastChatSelectedModels,
        availableModels.value,
        localEnabledModels.value
      );
    }
    
    const updatedSettings: Settings = {
      ...props.settings,
      apiKeys: {
        openrouter: localApiKey.value,
      },
      availableModels: [...availableModels.value],
      enabledModels: { ...localEnabledModels.value },
      lastChatSelectedModels: cleanedSelectedModels,
    };
    emit('save', updatedSettings);
    
    // Inform user to refresh models if they changed the API key
    if (apiKeyChanged) {
      alert('API key saved! Please go to Settings > Data to refresh your model list.');
    }
  } finally {
    isSaving.value = false;
  }
}

function handleUndoModels() {
  localEnabledModels.value = { ...originalEnabledModels.value };
}

async function handleSaveModels() {
  isSaving.value = true;
  try {
    originalEnabledModels.value = { ...localEnabledModels.value };
    
    // Validate and clean up lastChatSelectedModels based on new enabled models
    let cleanedSelectedModels: LLMModel[] = [];
    if (props.settings.lastChatSelectedModels && props.settings.lastChatSelectedModels.length > 0) {
      cleanedSelectedModels = validateSelectedModels(
        props.settings.lastChatSelectedModels,
        props.settings.availableModels || [],
        localEnabledModels.value
      );
    }
    
    const updatedSettings: Settings = {
      ...props.settings,
      enabledModels: localEnabledModels.value,
      // Use cleaned selection or empty array to trigger auto-selection
    lastChatSelectedModels: cleanedSelectedModels,
  };
  emit('save', updatedSettings);
  } finally {
    isSaving.value = false;
  }
}

function formatLastRefresh(): string {
  if (!props.settings.lastModelRefresh) {
    return 'Never';
  }
  
  const now = Date.now();
  const diff = now - props.settings.lastModelRefresh;
  
  // Less than a minute
  if (diff < 60000) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
  
  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }
  
  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }
  
  // Format as date
  return new Date(props.settings.lastModelRefresh).toLocaleString();
}

async function handleRefreshModels() {
  if (isRefreshingModels.value) return;
  
  isRefreshingModels.value = true;
  try {
    console.log('[SettingsPage] Refreshing models...');
    const allModels = await getAvailableModels();
    const apiKey = localApiKey.value || SHARED_OPENROUTER_API_KEY;
    const filtered = filterModelsByApiKey(allModels, apiKey);
    const sorted = sortModels(filtered);
    
    // Update available models
    availableModels.value = [...sorted];
    
    // Clean up enabled models - remove any that are no longer available
    const availableIds = new Set(sorted.map(m => m.id));
    const cleaned: Record<string, boolean> = {};
    Object.keys(localEnabledModels.value).forEach(id => {
      if (availableIds.has(id) && localEnabledModels.value[id]) {
        cleaned[id] = true;
      }
    });
    
    // If no models are enabled after cleaning, enable default models
    if (Object.keys(cleaned).length === 0 && sorted.length > 0) {
      const defaultModelIds = [
        'google/gemma-3n-e4b-it:free',
        'mistralai/mistral-7b-instruct:free',
        'moonshotai/kimi-k2:free',
        'openai/gpt-oss-20b:free',
      ];
      
      let enabledCount = 0;
      defaultModelIds.forEach(modelId => {
        const model = sorted.find(m => m.id === modelId);
        if (model) {
          cleaned[model.id] = true;
          enabledCount++;
        }
      });
      
      // Fallback: if none of the preferred models are available, enable first free model
      if (enabledCount === 0) {
        const defaultModel = sorted.find(m => m.isFree) || sorted[0];
        if (defaultModel) {
          cleaned[defaultModel.id] = true;
        }
      }
    }
    
    localEnabledModels.value = cleaned;
    
    // Save with updated timestamp
    const updatedSettings: Settings = {
      ...props.settings,
      availableModels: [...sorted],
      enabledModels: { ...cleaned },
      lastModelRefresh: Date.now(),
    };
    
    emit('save', updatedSettings);
    
    console.log(`[SettingsPage] Successfully refreshed ${sorted.length} models`);
  } catch (error) {
    console.error('[SettingsPage] Failed to refresh models:', error);
    alert('Failed to refresh models. Please check your internet connection and try again.');
  } finally {
    isRefreshingModels.value = false;
  }
}

function handleBack() {
  emit('close');
}
</script>

<style scoped>
/* Loading Spinner */
.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Custom range slider styling */
.range-slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, 
    var(--color-primary) 0%, 
    var(--color-primary) calc(var(--value, 100) * 1%), 
    rgba(255, 255, 255, 0.1) calc(var(--value, 100) * 1%), 
    rgba(255, 255, 255, 0.1) 100%);
  outline: none;
  cursor: pointer;
  transition: background 0.15s ease;
}

.range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  border: 2px solid var(--color-background);
}

.range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4);
}

.range-slider::-webkit-slider-thumb:active {
  transform: scale(1.05);
}

.range-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  border: 2px solid var(--color-background);
}

.range-slider::-moz-range-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4);
}

.range-slider::-moz-range-thumb:active {
  transform: scale(1.05);
}

.range-slider::-moz-range-track {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
}

/* Legacy fallback for older range inputs */
input[type="range"]:not(.range-slider) {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type="range"]:not(.range-slider)::-webkit-slider-track {
  background: var(--color-border);
  height: 0.5rem;
  border-radius: 0.25rem;
}

input[type="range"]:not(.range-slider)::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-primary);
  height: 1.25rem;
  width: 1.25rem;
  border-radius: 50%;
  margin-top: -0.375rem;
}

input[type="range"]:not(.range-slider)::-moz-range-track {
  background: var(--color-border);
  height: 0.5rem;
  border-radius: 0.25rem;
}

input[type="range"]:not(.range-slider)::-moz-range-thumb {
  background: var(--color-primary);
  height: 1.25rem;
  width: 1.25rem;
  border-radius: 50%;
  border: none;
}

/* Reset button hover states */
.reset-button:hover {
  background: var(--color-background);
  color: var(--color-text-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.reset-button:active {
  transform: translateY(0);
  box-shadow: none;
}
</style>
