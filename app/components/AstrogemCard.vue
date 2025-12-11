<script setup lang="ts">
import type { Astrogem, AstrogemCategory } from '~/types/arkgrid'

const props = defineProps<{
  astrogem: Astrogem
}>()

const emit = defineEmits<{
  'update:astrogem': [astrogem: Astrogem]
  'remove': []
}>()

const categoryOptions: AstrogemCategory[] = ['Order', 'Chaos']

function updateField<K extends keyof Astrogem>(field: K, value: Astrogem[K]) {
  emit('update:astrogem', { ...props.astrogem, [field]: value })
}

const categoryColor = computed(() => {
  return props.astrogem.category === 'Order' ? 'red' : 'blue'
})
</script>

<template>
  <UCard :ui="{ root: `border border-${categoryColor}-400/50` }">
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-gem"
            :class="astrogem.category === 'Order' ? 'text-red-500' : 'text-blue-500'"
            class="size-4"
          />
          <span class="text-sm font-medium">{{ astrogem.category }} Astrogem</span>
        </div>
        <UButton
          icon="i-lucide-x"
          color="error"
          variant="ghost"
          size="xs"
          @click="emit('remove')"
        />
      </div>

      <UFormField label="Category" size="sm">
        <USelect
          :model-value="astrogem.category"
          :items="categoryOptions"
          size="sm"
          @update:model-value="updateField('category', $event as AstrogemCategory)"
        />
      </UFormField>

      <div class="grid grid-cols-2 gap-2">
        <UFormField size="sm">
          <template #label>
            <span class="flex items-center gap-1">
              <img src="/images/astrogem_willpower.png" class="size-4" alt="Willpower">
              Willpower
            </span>
          </template>
          <UInput
            type="number"
            :model-value="astrogem.willpower"
            :min="3"
            :max="10"
            size="sm"
            placeholder="3-10"
            @update:model-value="updateField('willpower', Number($event) || 0)"
          />
        </UFormField>

        <UFormField size="sm">
          <template #label>
            <span class="flex items-center gap-1">
              <img src="/images/astrogem_point.png" class="size-4" alt="Core Points">
              Core Points
            </span>
          </template>
          <UInput
            type="number"
            :model-value="astrogem.points"
            :min="1"
            :max="5"
            size="sm"
            placeholder="1-5"
            @update:model-value="updateField('points', Number($event) || 0)"
          />
        </UFormField>
      </div>
    </div>
  </UCard>
</template>
