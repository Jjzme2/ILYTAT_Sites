<script setup lang="ts">
import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  NodeViewContent,
  VueNodeViewRenderer,
} from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import LinkExtension from '@tiptap/extension-link'
import { TextStyle as TextStyleExtension, Color as ColorExtension } from '@tiptap/extension-text-style'
import PlaceholderExtension from '@tiptap/extension-placeholder'
import { Node, mergeAttributes } from '@tiptap/core'
import { defineComponent, markRaw } from 'vue'
import type { BlogPost, BlogPostStyle } from '~/types'

const props = defineProps<{
  modelValue: Partial<BlogPost>
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Partial<BlogPost>]
  save: []
  close: []
}>()

function updatePost(field: keyof BlogPost, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

// ── Slug auto-generation ────────────────────────────────────────────────────
function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}
watch(() => props.modelValue.title, (t) => {
  if (t && !props.modelValue.id) updatePost('slug', toSlug(t))
})

// ── Tags ────────────────────────────────────────────────────────────────────
const tagInput = ref('')
function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !(props.modelValue.tags || []).includes(tag)) {
    updatePost('tags', [...(props.modelValue.tags || []), tag])
    tagInput.value = ''
  }
}
function removeTag(t: string) {
  updatePost('tags', (props.modelValue.tags || []).filter(x => x !== t))
}

// ── Style helpers ───────────────────────────────────────────────────────────
const DEFAULT_STYLE: BlogPostStyle = { accentColor: '#6366f1', heroStyle: 'gradient', fontStyle: 'sans' }
const postStyle = computed((): BlogPostStyle => ({ ...DEFAULT_STYLE, ...(props.modelValue.style || {}) }))
function updateStyle(field: keyof BlogPostStyle, value: string) {
  updatePost('style', { ...postStyle.value, [field]: value })
}

// ── Tiptap Custom NodeViews ─────────────────────────────────────────────────

const CalloutNodeView = markRaw(defineComponent({
  name: 'CalloutNodeView',
  components: { NodeViewWrapper, NodeViewContent },
  props: {
    node: { type: Object, required: true },
    updateAttributes: { type: Function, required: true },
  },
  setup(props) {
    const calloutType = computed(() => props.node.attrs?.type || 'info')
    const icon = computed(() => ({ info: 'ℹ️', warning: '⚠️', success: '✅', danger: '🚨' }[calloutType.value as string] || 'ℹ️'))
    return { calloutType, icon }
  },
  template: `
    <NodeViewWrapper :data-callout="calloutType" :class="'callout-block callout-' + calloutType">
      <div class="callout-header" contenteditable="false">
        <span class="callout-icon">{{ icon }}</span>
        <select
          :value="calloutType"
          @change="updateAttributes({ type: ($event.target as HTMLSelectElement).value })"
          class="callout-type-select"
        >
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="success">success</option>
          <option value="danger">danger</option>
        </select>
      </div>
      <NodeViewContent class="callout-content" />
    </NodeViewWrapper>
  `,
}))

const AccordionNodeView = markRaw(defineComponent({
  name: 'AccordionNodeView',
  components: { NodeViewWrapper, NodeViewContent },
  props: {
    node: { type: Object, required: true },
    updateAttributes: { type: Function, required: true },
  },
  template: `
    <NodeViewWrapper class="accordion-block">
      <div class="accordion-summary-row" contenteditable="false">
        <span class="accordion-chevron">▶</span>
        <input
          :value="node.attrs?.summary || ''"
          @input="updateAttributes({ summary: ($event.target as HTMLInputElement).value })"
          placeholder="Section title..."
          class="accordion-summary-input"
        />
      </div>
      <NodeViewContent class="accordion-body" />
    </NodeViewWrapper>
  `,
}))

// ── Custom Tiptap Extensions ────────────────────────────────────────────────

const CalloutExtension = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  attrs: { type: { default: 'info' } },
  parseHTML() {
    return [{ tag: 'div[data-callout]', getAttrs: el => ({ type: (el as HTMLElement).dataset.callout || 'info' }) }]
  },
  renderHTML({ node }) {
    return ['div', mergeAttributes({ 'data-callout': node.attrs.type, class: `callout callout-${node.attrs.type}` }), 0]
  },
  addNodeView() { return VueNodeViewRenderer(CalloutNodeView) },
  addCommands() {
    return {
      insertCallout: (attrs?: { type: string }) => ({ commands }: Record<string, unknown>) =>
        (commands as { insertContent: (c: unknown) => boolean }).insertContent({
          type: 'callout',
          attrs: attrs || { type: 'info' },
          content: [{ type: 'paragraph' }],
        }),
    }
  },
})

const AccordionExtension = Node.create({
  name: 'accordion',
  group: 'block',
  content: 'block+',
  defining: true,
  isolating: true,
  attrs: { summary: { default: 'Click to expand' } },
  parseHTML() {
    return [{
      tag: 'details',
      getAttrs: el => ({ summary: (el as HTMLElement).querySelector('summary')?.textContent?.trim() || 'Click to expand' }),
    }]
  },
  renderHTML({ node }) {
    return ['details', {}, ['summary', {}, node.attrs.summary], ['div', { class: 'accordion-body' }, 0]]
  },
  addNodeView() { return VueNodeViewRenderer(AccordionNodeView) },
  addCommands() {
    return {
      insertAccordion: (attrs?: { summary: string }) => ({ commands }: Record<string, unknown>) =>
        (commands as { insertContent: (c: unknown) => boolean }).insertContent({
          type: 'accordion',
          attrs: attrs || { summary: 'Click to expand' },
          content: [{ type: 'paragraph' }],
        }),
    }
  },
})

// ── Editor setup ────────────────────────────────────────────────────────────
const editor = useEditor({
  content: props.modelValue.content || '',
  extensions: [
    StarterKit,
    ImageExtension.configure({ inline: false, allowBase64: false }),
    LinkExtension.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    TextStyleExtension,
    ColorExtension,
    PlaceholderExtension.configure({ placeholder: 'Start writing your post...' }),
    CalloutExtension,
    AccordionExtension,
  ],
  onUpdate({ editor: e }) {
    updatePost('content', e.getHTML())
  },
})

watch(() => props.modelValue.content, (html) => {
  if (editor.value && html !== editor.value.getHTML()) {
    editor.value.commands.setContent(html || '', false)
  }
})

onBeforeUnmount(() => editor.value?.destroy())

// ── Link input ──────────────────────────────────────────────────────────────
const linkUrl = ref('')
const showLinkInput = ref(false)
function openLinkInput() {
  linkUrl.value = editor.value?.getAttributes('link').href || ''
  showLinkInput.value = true
  nextTick(() => (document.querySelector('.link-url-input') as HTMLInputElement)?.focus())
}
function applyLink() {
  if (!editor.value) return
  linkUrl.value
    ? editor.value.chain().focus().setLink({ href: linkUrl.value }).run()
    : editor.value.chain().focus().unsetLink().run()
  showLinkInput.value = false
  linkUrl.value = ''
}

// ── Image URL input ─────────────────────────────────────────────────────────
const imageUrl = ref('')
const showImageInput = ref(false)
function applyImage() {
  if (imageUrl.value && editor.value) {
    editor.value.chain().focus().setImage({ src: imageUrl.value }).run()
    imageUrl.value = ''
    showImageInput.value = false
  }
}

// ── Toolbar helper ──────────────────────────────────────────────────────────
function btn(active: boolean) {
  return ['tb-btn', active ? 'tb-btn-active' : ''].join(' ').trim()
}
</script>

<template>
  <div class="post-editor">
    <!-- ── Metadata ─────────────────────────────────────────────────────────── -->
    <div class="editor-meta">
      <div class="meta-row meta-row-wide">
        <label class="meta-label">Title</label>
        <input
          :value="modelValue.title || ''"
          @input="updatePost('title', ($event.target as HTMLInputElement).value)"
          class="meta-input meta-input-title"
          placeholder="Post title..."
        />
      </div>

      <div class="meta-row-split">
        <div class="meta-row">
          <label class="meta-label">Slug</label>
          <input
            :value="modelValue.slug || ''"
            @input="updatePost('slug', ($event.target as HTMLInputElement).value)"
            class="meta-input meta-input-mono"
            placeholder="url-slug"
          />
        </div>
        <div class="meta-row">
          <label class="meta-label">Author</label>
          <input
            :value="modelValue.authorName || ''"
            @input="updatePost('authorName', ($event.target as HTMLInputElement).value)"
            class="meta-input"
            placeholder="ILYTAT"
          />
        </div>
        <div class="meta-row">
          <label class="meta-label">Status</label>
          <select
            :value="modelValue.status || 'draft'"
            @change="updatePost('status', ($event.target as HTMLSelectElement).value)"
            class="meta-input meta-select"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>

      <div class="meta-row">
        <label class="meta-label">Excerpt</label>
        <textarea
          :value="modelValue.excerpt || ''"
          @input="updatePost('excerpt', ($event.target as HTMLTextAreaElement).value)"
          class="meta-input meta-textarea"
          rows="2"
          placeholder="Short summary shown in blog listings..."
        />
      </div>

      <div class="meta-row">
        <label class="meta-label">Cover Image URL</label>
        <input
          :value="modelValue.coverImage || ''"
          @input="updatePost('coverImage', ($event.target as HTMLInputElement).value)"
          class="meta-input"
          placeholder="https://..."
        />
      </div>

      <div class="meta-row">
        <label class="meta-label">Tags</label>
        <div class="tags-row">
          <span v-for="tag in (modelValue.tags || [])" :key="tag" class="tag-pill">
            {{ tag }}
            <button @click="removeTag(tag)" class="tag-remove">×</button>
          </span>
          <input
            v-model="tagInput"
            @keydown.enter.prevent="addTag"
            @keydown.comma.prevent="addTag"
            class="tag-input"
            placeholder="Add tag…"
          />
        </div>
      </div>
    </div>

    <!-- ── Style Panel ──────────────────────────────────────────────────────── -->
    <details class="style-panel">
      <summary class="style-panel-toggle">Post Style &amp; Appearance</summary>
      <div class="style-panel-body">
        <div class="style-row">
          <label class="style-label">Accent Color</label>
          <div class="color-picker-row">
            <input
              type="color"
              :value="postStyle.accentColor"
              @input="updateStyle('accentColor', ($event.target as HTMLInputElement).value)"
              class="color-swatch"
            />
            <input
              :value="postStyle.accentColor"
              @input="updateStyle('accentColor', ($event.target as HTMLInputElement).value)"
              class="meta-input meta-input-mono color-hex"
              maxlength="7"
              placeholder="#6366f1"
            />
          </div>
        </div>

        <div class="style-row">
          <label class="style-label">Hero Style</label>
          <div class="radio-group">
            <label v-for="opt in ['minimal', 'gradient', 'image']" :key="opt" class="radio-label">
              <input
                type="radio"
                :value="opt"
                :checked="postStyle.heroStyle === opt"
                @change="updateStyle('heroStyle', opt)"
              />
              {{ opt }}
            </label>
          </div>
        </div>

        <div class="style-row">
          <label class="style-label">Body Font</label>
          <div class="radio-group">
            <label v-for="opt in ['sans', 'serif']" :key="opt" class="radio-label">
              <input
                type="radio"
                :value="opt"
                :checked="postStyle.fontStyle === opt"
                @change="updateStyle('fontStyle', opt)"
              />
              {{ opt }}
            </label>
          </div>
        </div>

        <!-- Live accent preview -->
        <div class="accent-preview" :style="{ '--accent': postStyle.accentColor }">
          <span class="accent-sample-h">Preview heading</span>
          <span class="accent-sample-link">sample link</span>
          <span class="accent-sample-tag">tag</span>
        </div>
      </div>
    </details>

    <!-- ── Toolbar ──────────────────────────────────────────────────────────── -->
    <div v-if="editor" class="tb">
      <!-- Headings -->
      <button :class="btn(editor.isActive('heading', { level: 1 }))" @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" title="Heading 1">H1</button>
      <button :class="btn(editor.isActive('heading', { level: 2 }))" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" title="Heading 2">H2</button>
      <button :class="btn(editor.isActive('heading', { level: 3 }))" @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" title="Heading 3">H3</button>
      <span class="tb-sep" />

      <!-- Inline formatting -->
      <button :class="btn(editor.isActive('bold'))"          @click="editor.chain().focus().toggleBold().run()"          title="Bold"><b>B</b></button>
      <button :class="btn(editor.isActive('italic'))"        @click="editor.chain().focus().toggleItalic().run()"        title="Italic"><i>I</i></button>
      <button :class="btn(editor.isActive('strike'))"        @click="editor.chain().focus().toggleStrike().run()"        title="Strikethrough"><s>S</s></button>
      <button :class="btn(editor.isActive('code'))"          @click="editor.chain().focus().toggleCode().run()"          title="Inline code"><code>` `</code></button>
      <span class="tb-sep" />

      <!-- Lists -->
      <button :class="btn(editor.isActive('bulletList'))"    @click="editor.chain().focus().toggleBulletList().run()"    title="Bullet list">• List</button>
      <button :class="btn(editor.isActive('orderedList'))"   @click="editor.chain().focus().toggleOrderedList().run()"   title="Numbered list">1. List</button>
      <span class="tb-sep" />

      <!-- Blocks -->
      <button :class="btn(editor.isActive('blockquote'))"    @click="editor.chain().focus().toggleBlockquote().run()"   title="Blockquote">" "</button>
      <button :class="btn(editor.isActive('codeBlock'))"     @click="editor.chain().focus().toggleCodeBlock().run()"    title="Code block">{ }</button>
      <button class="tb-btn"                                  @click="editor.chain().focus().setHorizontalRule().run()"  title="Divider">—</button>
      <span class="tb-sep" />

      <!-- Link -->
      <button :class="btn(editor.isActive('link'))" @click="openLinkInput" title="Link">🔗</button>

      <!-- Image -->
      <button class="tb-btn" @click="showImageInput = !showImageInput" title="Image">🖼</button>
      <span class="tb-sep" />

      <!-- Custom blocks -->
      <button class="tb-btn tb-callout" @click="(editor.commands as unknown as Record<string, () => void>).insertCallout?.()" title="Callout block">Callout</button>
      <button class="tb-btn tb-accordion" @click="(editor.commands as unknown as Record<string, () => void>).insertAccordion?.()" title="Accordion block">Accordion</button>
      <span class="tb-sep" />

      <!-- History -->
      <button class="tb-btn" :disabled="!editor.can().undo()" @click="editor.chain().focus().undo().run()" title="Undo">↩</button>
      <button class="tb-btn" :disabled="!editor.can().redo()" @click="editor.chain().focus().redo().run()" title="Redo">↪</button>
    </div>

    <!-- Link input popover -->
    <div v-if="showLinkInput" class="tb-popover">
      <input v-model="linkUrl" class="tb-popover-input link-url-input" placeholder="https://..." @keydown.enter.prevent="applyLink" @keydown.escape="showLinkInput = false" />
      <button class="tb-popover-btn" @click="applyLink">Apply</button>
      <button class="tb-popover-btn tb-popover-btn-secondary" @click="editor?.chain().focus().unsetLink().run(); showLinkInput = false">Remove</button>
    </div>

    <!-- Image input popover -->
    <div v-if="showImageInput" class="tb-popover">
      <input v-model="imageUrl" class="tb-popover-input" placeholder="Image URL (https://...)" @keydown.enter.prevent="applyImage" @keydown.escape="showImageInput = false" />
      <button class="tb-popover-btn" @click="applyImage">Insert</button>
    </div>

    <!-- ── Tiptap Editor Area ────────────────────────────────────────────────── -->
    <EditorContent :editor="editor" class="editor-content" />

    <!-- ── Action Row ────────────────────────────────────────────────────────── -->
    <div class="editor-actions">
      <button class="editor-btn editor-btn-secondary" @click="emit('close')">Cancel</button>
      <button class="editor-btn editor-btn-primary" :disabled="loading" @click="emit('save')">
        {{ loading ? 'Saving…' : (modelValue.id ? 'Update Post' : 'Create Post') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────────── */
.post-editor { display: flex; flex-direction: column; gap: 0; }

/* ── Metadata ───────────────────────────────────────────────────────────────── */
.editor-meta { display: flex; flex-direction: column; gap: 12px; padding: 20px; border-bottom: 1px solid #2a2a32; }
.meta-row { display: flex; flex-direction: column; gap: 4px; }
.meta-row-wide { }
.meta-row-split { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
.meta-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #888; }
.meta-input {
  background: #0f0f11; border: 1px solid #2a2a32; border-radius: 6px;
  color: #f0ece6; font-size: 14px; padding: 8px 10px; outline: none; width: 100%;
  transition: border-color .15s;
}
.meta-input:focus { border-color: #6366f1; }
.meta-input-title { font-size: 18px; font-weight: 600; }
.meta-input-mono { font-family: 'Space Mono', monospace; font-size: 12px; }
.meta-textarea { resize: vertical; min-height: 56px; }
.meta-select { cursor: pointer; }

/* Tags */
.tags-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 6px 8px; background: #0f0f11; border: 1px solid #2a2a32; border-radius: 6px; min-height: 38px; }
.tag-pill { display: flex; align-items: center; gap: 4px; background: #1e1e28; border: 1px solid #3a3a48; border-radius: 4px; padding: 2px 8px; font-size: 12px; color: #c0bdb8; }
.tag-remove { background: none; border: none; color: #888; cursor: pointer; font-size: 14px; padding: 0 2px; line-height: 1; }
.tag-input { background: none; border: none; outline: none; color: #f0ece6; font-size: 13px; min-width: 80px; flex: 1; }

/* ── Style Panel ────────────────────────────────────────────────────────────── */
.style-panel { border-bottom: 1px solid #2a2a32; }
.style-panel-toggle {
  cursor: pointer; padding: 12px 20px; font-size: 12px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .05em; color: #888;
  list-style: none; user-select: none;
}
.style-panel-toggle:hover { color: #c0bdb8; }
.style-panel-body { display: flex; flex-direction: column; gap: 14px; padding: 0 20px 16px; }
.style-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.style-label { font-size: 12px; color: #888; min-width: 90px; }
.color-picker-row { display: flex; align-items: center; gap: 8px; }
.color-swatch { width: 36px; height: 36px; border: none; border-radius: 6px; cursor: pointer; padding: 0; background: none; }
.color-hex { width: 100px; }
.radio-group { display: flex; gap: 14px; }
.radio-label { display: flex; align-items: center; gap: 5px; font-size: 13px; color: #c0bdb8; cursor: pointer; }

/* Accent preview */
.accent-preview {
  display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
  padding: 10px 14px; background: #0f0f11; border-radius: 6px; border: 1px solid #2a2a32;
}
.accent-sample-h { font-weight: 700; color: var(--accent, #6366f1); font-size: 15px; }
.accent-sample-link { color: var(--accent, #6366f1); text-decoration: underline; font-size: 13px; cursor: pointer; }
.accent-sample-tag {
  background: color-mix(in srgb, var(--accent, #6366f1) 20%, transparent);
  color: var(--accent, #6366f1);
  border-radius: 4px; padding: 2px 8px; font-size: 12px;
}

/* ── Toolbar ────────────────────────────────────────────────────────────────── */
.tb {
  display: flex; flex-wrap: wrap; align-items: center; gap: 2px;
  padding: 8px 14px; background: #13131a; border-bottom: 1px solid #2a2a32;
  position: sticky; top: 0; z-index: 10;
}
.tb-btn {
  background: none; border: 1px solid transparent; border-radius: 5px;
  color: #9996a8; font-size: 12px; padding: 4px 8px; cursor: pointer;
  transition: all .12s; line-height: 1.4; white-space: nowrap;
}
.tb-btn:hover { background: #1e1e28; color: #f0ece6; border-color: #2a2a32; }
.tb-btn:disabled { opacity: .35; cursor: default; }
.tb-btn-active { background: #2a2a38 !important; color: #f0ece6 !important; border-color: #4a4a58 !important; }
.tb-callout { color: #6ba3e0; }
.tb-accordion { color: #a78bfa; }
.tb-sep { width: 1px; height: 20px; background: #2a2a32; margin: 0 4px; }

/* Popovers */
.tb-popover {
  display: flex; gap: 6px; padding: 8px 14px; align-items: center;
  background: #13131a; border-bottom: 1px solid #2a2a32;
}
.tb-popover-input {
  flex: 1; background: #0f0f11; border: 1px solid #3a3a48; border-radius: 5px;
  color: #f0ece6; font-size: 13px; padding: 6px 10px; outline: none;
}
.tb-popover-input:focus { border-color: #6366f1; }
.tb-popover-btn {
  background: #6366f1; border: none; border-radius: 5px; color: #fff;
  font-size: 12px; padding: 6px 12px; cursor: pointer;
}
.tb-popover-btn-secondary { background: #2a2a38; color: #c0bdb8; }

/* ── Editor content area ────────────────────────────────────────────────────── */
.editor-content {
  min-height: 360px; padding: 20px 24px;
  background: #0d0d12; border-bottom: 1px solid #2a2a32;
}

:deep(.tiptap) {
  outline: none; min-height: 340px; font-size: 15px; line-height: 1.75; color: #e8e4de;
}
:deep(.tiptap p.is-editor-empty:first-child::before) {
  color: #555; content: attr(data-placeholder); float: left; height: 0; pointer-events: none;
}

/* Headings */
:deep(.tiptap h1) { font-size: 2em; font-weight: 700; margin: 1em 0 .4em; }
:deep(.tiptap h2) { font-size: 1.5em; font-weight: 600; margin: .9em 0 .35em; }
:deep(.tiptap h3) { font-size: 1.2em; font-weight: 600; margin: .8em 0 .3em; }

/* Lists */
:deep(.tiptap ul) { padding-left: 1.5em; list-style: disc; }
:deep(.tiptap ol) { padding-left: 1.5em; list-style: decimal; }
:deep(.tiptap li) { margin: .2em 0; }

/* Blockquote */
:deep(.tiptap blockquote) {
  border-left: 3px solid #6366f1; margin: 1em 0; padding: .5em 1em;
  background: rgba(99,102,241,.08); border-radius: 0 6px 6px 0; color: #c0bdb8;
}

/* Code */
:deep(.tiptap code) { background: #1e1e28; border-radius: 4px; padding: 2px 5px; font-family: 'Space Mono', monospace; font-size: .88em; }
:deep(.tiptap pre) { background: #1a1a24; border-radius: 8px; padding: 16px 20px; overflow-x: auto; margin: 1em 0; }
:deep(.tiptap pre code) { background: none; padding: 0; font-size: .9em; }

/* Images */
:deep(.tiptap img) { max-width: 100%; border-radius: 8px; margin: .5em 0; display: block; }

/* HR */
:deep(.tiptap hr) { border: none; border-top: 1px solid #2a2a32; margin: 1.5em 0; }

/* Links */
:deep(.tiptap a) { color: #6366f1; text-decoration: underline; }

/* ── Callout blocks ──────────────────────────────────────────────────────────── */
:deep(.callout-block) {
  border-radius: 8px; margin: 1em 0; padding: 0; overflow: hidden;
  border: 1px solid;
}
:deep(.callout-info)    { background: rgba( 99,102,241,.10); border-color: rgba( 99,102,241,.35); }
:deep(.callout-warning) { background: rgba(251,191, 36,.10); border-color: rgba(251,191, 36,.35); }
:deep(.callout-success) { background: rgba( 34,197, 94,.10); border-color: rgba( 34,197, 94,.35); }
:deep(.callout-danger)  { background: rgba(239, 68, 68,.10); border-color: rgba(239, 68, 68,.35); }
:deep(.callout-header) {
  display: flex; align-items: center; gap: 8px; padding: 8px 14px;
  font-size: 12px; font-weight: 600; text-transform: uppercase;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
:deep(.callout-type-select) {
  background: transparent; border: none; outline: none; font-size: 11px;
  font-weight: 600; text-transform: uppercase; cursor: pointer;
  color: inherit; opacity: .7;
}
:deep(.callout-content) { padding: 12px 14px; }
:deep(.callout-content p:last-child) { margin-bottom: 0; }

/* ── Accordion blocks ────────────────────────────────────────────────────────── */
:deep(.accordion-block) {
  border: 1px solid #2a2a32; border-radius: 8px; margin: 1em 0; overflow: hidden;
  background: #13131a;
}
:deep(.accordion-summary-row) {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border-bottom: 1px solid #2a2a32; background: #1a1a24;
}
:deep(.accordion-chevron) { font-size: 10px; color: #666; }
:deep(.accordion-summary-input) {
  background: none; border: none; outline: none; color: #c0bdb8;
  font-size: 14px; font-weight: 500; flex: 1; cursor: text;
}
:deep(.accordion-body) { padding: 12px 14px; }

/* ── Action row ─────────────────────────────────────────────────────────────── */
.editor-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 20px; background: #13131a;
}
.editor-btn {
  border-radius: 7px; font-size: 14px; font-weight: 600;
  padding: 9px 22px; cursor: pointer; border: none; transition: opacity .15s;
}
.editor-btn:disabled { opacity: .5; cursor: not-allowed; }
.editor-btn-primary { background: #6366f1; color: #fff; }
.editor-btn-primary:hover:not(:disabled) { opacity: .85; }
.editor-btn-secondary { background: #1e1e28; color: #c0bdb8; border: 1px solid #3a3a48; }
.editor-btn-secondary:hover { background: #2a2a38; }
</style>
