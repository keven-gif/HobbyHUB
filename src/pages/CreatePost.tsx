import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Camera,
  Video,
  X,
  Play,
  Eye,
  ChevronDown,
  Check,
  ClipboardList,
  Plus,
  Trash2,
  Flame,
} from 'lucide-react'
import { usePosts } from '@/context/PostContext'
import { useAuth } from '@/context/AuthContext'
import { useJoinedSubcommittees } from '@/hooks/useJoinedSubcommittees'
import { getAllCommunities, getSubcommittees } from '@/data/communityData'
import { toast } from 'sonner'
import { fileToBase64 } from '@/lib/filePicker'
import { compressImage } from '@/lib/imageCompress'

/* ------------------------------------------------------------------ */
/*  Subcommittee helpers                                               */
/* ------------------------------------------------------------------ */
function getParentCommunityId(subcommitteeId: string): string {
  for (const commId of getAllCommunities()) {
    const subs = getSubcommittees(commId);
    if (subs.some((s) => s.id === subcommitteeId)) {
      return commId;
    }
  }
  return subcommitteeId; // fallback
}

function getAllJoinedSubcommittees(joinedIds: Set<string>) {
  const result: { subId: string; subName: string; subDescription: string; parentId: string; parentName: string; parentColor: string }[] = [];
  for (const commId of getAllCommunities()) {
    const subs = getSubcommittees(commId);
    for (const sub of subs) {
      if (joinedIds.has(sub.id)) {
        result.push({
          subId: sub.id,
          subName: sub.name,
          subDescription: sub.description,
          parentId: commId,
          parentName: commId,
          parentColor: '#d93a3a',
        });
      }
    }
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface MediaFile {
  id: string
  file: File
  preview: string
  type: 'image' | 'video'
}

interface BuildStep {
  id: string
  image: string | null
  description: string
}

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */
function CreateHeader({ canPost, onPost }: { canPost: boolean; onPost: () => void }) {
  const navigate = useNavigate()

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: easeOutExpo }}
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 lg:px-8"
      style={{
        backgroundColor: 'rgba(15, 17, 21, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="w-full flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 font-body text-sm font-medium transition-colors duration-200 hover:text-white"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={20} />
          <span className="hidden sm:inline">Back</span>
        </button>

        <h1
          className="absolute left-1/2 -translate-x-1/2 font-display text-xl tracking-[2px]"
          style={{ color: 'var(--text-primary)' }}
        >
          CREATE POST
        </h1>

        <button
          onClick={onPost}
          disabled={!canPost}
          className="font-body text-sm font-semibold px-7 py-2.5 rounded transition-all duration-200"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            opacity: canPost ? 1 : 0.5,
            cursor: canPost ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={(e) => {
            if (canPost) (e.target as HTMLElement).style.backgroundColor = 'var(--accent-primary-hover)'
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = 'var(--accent-primary)'
          }}
        >
          Post &rarr;
        </button>
      </div>
    </motion.header>
  )
}

/* ------------------------------------------------------------------ */
/*  Media Upload                                                       */
/* ------------------------------------------------------------------ */
function MediaUpload({
  mediaFiles,
  setMediaFiles,
}: {
  mediaFiles: MediaFile[]
  setMediaFiles: React.Dispatch<React.SetStateAction<MediaFile[]>>
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [primaryIndex, setPrimaryIndex] = useState(0)

  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return
      setUploadError(null)
      const newFiles: MediaFile[] = []
      for (const file of Array.from(files)) {
        if (mediaFiles.length + newFiles.length >= 10) break

        // Video size validation
        if (file.type.startsWith('video/')) {
          if (file.size > 20 * 1024 * 1024) {
            setUploadError(`Video "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 20MB.`)
            continue
          }
          // Check video duration
          const video = document.createElement('video')
          video.preload = 'metadata'
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src)
            if (video.duration > 60) {
              setUploadError(`Video "${file.name}" is too long (${Math.round(video.duration)}s). Max 60 seconds.`)
              setMediaFiles((prev) => prev.filter((m) => m.file !== file))
            }
          }
          video.src = URL.createObjectURL(file)
        }

        // Image size validation
        if (file.type.startsWith('image/') && file.size > 10 * 1024 * 1024) {
          setUploadError(`Image "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`)
          continue
        }

        newFiles.push({
          id: Math.random().toString(36).slice(2),
          file,
          preview: URL.createObjectURL(file),
          type: file.type.startsWith('video/') ? 'video' : 'image',
        })
      }
      setMediaFiles((prev) => [...prev, ...newFiles].slice(0, 10))
    },
    [mediaFiles.length, setMediaFiles],
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const removeMedia = (id: string) => {
    setMediaFiles((prev) => {
      const filtered = prev.filter((m) => m.id !== id)
      if (primaryIndex >= filtered.length) setPrimaryIndex(Math.max(0, filtered.length - 1))
      return filtered
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOutExpo }}
      className="mt-20"
    >
      {/* Upload error */}
      {uploadError && (
        <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#ef444420', border: '1px solid #ef444440' }}>
          <p className="font-body text-xs" style={{ color: '#ef4444' }}>{uploadError}</p>
          <button onClick={() => setUploadError(null)} className="font-body text-[10px] mt-1" style={{ color: '#ef4444', textDecoration: 'underline' }}>Dismiss</button>
        </div>
      )}

      {mediaFiles.length === 0 ? (
        <>
          {/* Mobile upload zone — direct input tap, no hidden/className:hidden */}
          <div className="relative">
            {/* Visible upload area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className="flex flex-col items-center justify-center text-center pointer-events-none"
              style={{
                backgroundColor: isDragOver ? 'rgba(74,128,255,0.05)' : 'var(--bg-surface)',
                border: isDragOver
                  ? '2px dashed var(--accent-secondary)'
                  : '2px dashed var(--border-subtle)',
                borderRadius: '4px',
                padding: '80px 40px',
                minHeight: '320px',
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <Camera size={40} style={{ color: 'var(--text-muted)' }} />
                <Video size={40} style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="font-body text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                Tap to add photos or videos
              </p>
              <p className="font-body text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                Supports: JPG, PNG, GIF, MP4 (up to 50MB)
              </p>
            </div>
            {/* File input covers the area — 0.01 opacity for Android compatibility */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={(e) => handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full rounded"
              style={{
                opacity: 0.01,
                cursor: 'pointer',
                zIndex: 10,
              }}
            />
          </div>
        </>
      ) : (
        /* Media preview */
        <div className="space-y-4">
          {/* Primary media */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: easeOutExpo }}
            className="relative rounded overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            <div className="relative aspect-video">
              {mediaFiles[primaryIndex]?.type === 'video' ? (
                <>
                  <video
                    src={mediaFiles[primaryIndex].preview}
                    className="w-full h-full object-cover"
                    controls
                  />
                </>
              ) : (
                <img
                  src={mediaFiles[primaryIndex]?.preview}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <button
              onClick={() => removeMedia(mediaFiles[primaryIndex].id)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-[var(--accent-primary)]"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <X size={16} color="#fff" />
            </button>
          </motion.div>

          {/* Feed Preview — shows how image will appear in the feed */}
          {mediaFiles[primaryIndex]?.type === 'image' && (
            <div className="rounded-lg p-3" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <div className="flex items-center gap-2 mb-2">
                <Eye size={12} style={{ color: '#666' }} />
                <span className="font-body text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#666' }}>Feed Preview</span>
                <span className="font-body text-[10px]" style={{ color: '#444' }}>— This is how your image will appear in the feed</span>
              </div>
              <div className="overflow-hidden rounded" style={{ maxHeight: '200px', backgroundColor: '#0a0a0a' }}>
                <img
                  src={mediaFiles[primaryIndex].preview}
                  alt=""
                  className="w-full object-cover"
                  style={{ maxHeight: '200px' }}
                />
              </div>
              {mediaFiles[primaryIndex].file && (
                <p className="font-body text-[10px] mt-1.5" style={{ color: '#444' }}>
                  Original: {mediaFiles[primaryIndex].file.type.split('/')[1].toUpperCase()} · {(mediaFiles[primaryIndex].file.size / 1024 / 1024).toFixed(2)}MB
                </p>
              )}
            </div>
          )}

          {/* Video info */}
          {mediaFiles[primaryIndex]?.type === 'video' && (
            <div className="rounded-lg p-3 flex items-center gap-2" style={{ backgroundColor: '#111111', border: '1px solid #222222' }}>
              <Play size={14} style={{ color: '#d93a3a' }} />
              <span className="font-body text-xs" style={{ color: '#aaa' }}>
                Video: {(mediaFiles[primaryIndex].file.size / 1024 / 1024).toFixed(1)}MB · Max 60 seconds · Max 20MB
              </span>
            </div>
          )}

          {/* Thumbnail strip */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {mediaFiles.map((media, i) => (
              <motion.div
                key={media.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`relative flex-shrink-0 w-20 h-20 rounded overflow-hidden cursor-pointer transition-all duration-200 ${
                  i === primaryIndex ? 'ring-2 ring-[var(--accent-primary)]' : 'opacity-70 hover:opacity-100'
                }`}
                onClick={() => setPrimaryIndex(i)}
              >
                {media.type === 'video' ? (
                  <div className="relative w-full h-full">
                    <video src={media.preview} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
                      <Play size={16} color="#fff" />
                    </div>
                  </div>
                ) : (
                  <img src={media.preview} alt="" className="w-full h-full object-cover" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeMedia(media.id)
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X size={10} color="#fff" />
                </button>
              </motion.div>
            ))}

            {/* Add more button */}
            {mediaFiles.length < 10 && (
              <div className="relative flex-shrink-0 w-20 h-20">
                <div
                  className="w-full h-full rounded flex flex-col items-center justify-center"
                  style={{
                    border: '2px dashed var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Camera size={20} />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => handleFiles(e.target.files)}
                  className="absolute inset-0 w-full h-full rounded"
                  style={{ opacity: 0.01, cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Subcommittee Selector                                              */
/* ------------------------------------------------------------------ */
function SubcommitteeSelector({
  selected,
  onSelect,
  joinedSubIds,
}: {
  selected: string | null
  onSelect: (id: string) => void
  joinedSubIds: Set<string>
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const joinedSubs = getAllJoinedSubcommittees(joinedSubIds)

  if (joinedSubIds.size === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
        className="mt-8"
      >
        <h3 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
          SUBCOMMITTEE
        </h3>
        <div
          className="w-full flex items-center justify-center px-4 h-12 rounded font-body text-sm"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px dashed var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          Join a subcommittee first to start posting
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
      className="mt-8"
    >
      <h3 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
        SUBCOMMITTEE
      </h3>

      {/* Dropdown */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between px-4 h-12 rounded font-body text-base transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: selected
              ? 'var(--text-primary)'
              : 'var(--text-muted)',
          }}
        >
          <span>
            {selected
              ? joinedSubs.find((s) => s.subId === selected)?.subName
              : 'Select a subcommittee...'}
          </span>
          <ChevronDown
            size={18}
            style={{
              color: 'var(--text-muted)',
              transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 0.2s ease',
            }}
          />
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-1 rounded overflow-hidden z-10"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-active)',
              }}
            >
              {joinedSubs.map((sub) => (
                <button
                  key={sub.subId}
                  onClick={() => {
                    onSelect(sub.subId)
                    setDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-[var(--bg-surface-hover)] text-left"
                  style={{
                    borderLeft: selected === sub.subId ? '3px solid var(--accent-primary)' : '3px solid transparent',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center font-display text-xs"
                    style={{ backgroundColor: 'var(--accent-primary)20', color: 'var(--accent-primary)' }}
                  >
                    {sub.subName[0]}
                  </div>
                  <div>
                    <p className="font-body text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {sub.subName}
                    </p>
                    <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
                      in {sub.parentId}
                    </p>
                  </div>
                  {selected === sub.subId && <Check size={16} className="ml-auto" style={{ color: 'var(--accent-secondary)' }} />}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick select grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        {joinedSubs.map((sub, i) => (
          <motion.button
            key={sub.subId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.06 * i, ease: easeOutExpo }}
            onClick={() => onSelect(sub.subId)}
            className="relative rounded overflow-hidden transition-all duration-200 text-left p-3"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: selected === sub.subId ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
            }}
          >
            <p className="font-body text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {sub.subName}
            </p>
            <p className="font-body text-[11px] line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              {sub.subDescription}
            </p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Build Log Toggle                                                   */
/* ------------------------------------------------------------------ */
function BuildLogSection({
  enabled,
  onToggle,
  steps,
  setSteps,
}: {
  enabled: boolean
  onToggle: () => void
  steps: BuildStep[]
  setSteps: React.Dispatch<React.SetStateAction<BuildStep[]>>
}) {
  // Build log step photo input no longer needs a ref — each step has its own direct input

  const addStep = () => {
    const newStep: BuildStep = {
      id: `step-${Date.now()}`,
      image: null,
      description: '',
    }
    setSteps((prev) => [...prev, newStep])
  }

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id))
  }

  const updateStepDescription = (id: string, desc: string) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, description: desc } : s)))
  }

  const handleStepImage = (e: React.ChangeEvent<HTMLInputElement>, stepId: string) => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    setSteps((prev) => prev.map((s) => (s.id === stepId ? { ...s, image: preview } : s)))
  }

  return (
    <div className="mt-8">
      {/* Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.2 }}
        className="flex items-center justify-between p-4 rounded cursor-pointer transition-colors duration-200"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
        }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <ClipboardList size={20} style={{ color: 'var(--accent-secondary)' }} />
          <div>
            <p className="font-body text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Build Log
            </p>
            <p className="font-body text-xs" style={{ color: 'var(--text-muted)' }}>
              Document your build process step by step
            </p>
          </div>
        </div>
        <div
          className="w-11 h-6 rounded-full relative transition-colors duration-200"
          style={{ backgroundColor: enabled ? 'var(--accent-primary)' : 'var(--border-subtle)' }}
        >
          <motion.div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white"
            animate={{ left: enabled ? 22 : 2 }}
            transition={{ duration: 0.2 }}
          />
        </div>
      </motion.div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: easeOutExpo }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              <div className="space-y-4">
                <AnimatePresence>
                  {steps.map((step, i) => (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="p-4 rounded"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                          STEP {i + 1}
                        </span>
                        <button
                          onClick={() => removeStep(step.id)}
                          className="transition-colors duration-200 hover:text-[var(--accent-primary)]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Step image */}
                      <div className="mb-3">
                        {step.image ? (
                          <div className="relative rounded overflow-hidden">
                            <img src={step.image} alt="" className="w-full h-40 object-cover" />
                            <button
                              onClick={() => {
                                setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, image: null } : s)))
                              }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                            >
                              <X size={12} color="#fff" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative w-full h-24">
                            <div
                              className="w-full h-24 rounded flex flex-col items-center justify-center gap-2"
                              style={{
                                border: '2px dashed var(--border-subtle)',
                                color: 'var(--text-muted)',
                              }}
                            >
                              <Camera size={20} />
                              <span className="font-body text-xs">Add step photo</span>
                            </div>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleStepImage(e, step.id)}
                              className="absolute inset-0 w-full h-full rounded"
                              style={{ opacity: 0.01, cursor: 'pointer' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Step description */}
                      <textarea
                        value={step.description}
                        onChange={(e) => updateStepDescription(step.id, e.target.value)}
                        placeholder={`Describe step ${i + 1}...`}
                        rows={2}
                        className="w-full px-3 py-2 rounded font-body text-sm resize-none transition-all duration-200 focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-input)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                        onFocus={(e) => {
                          (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent-secondary)'
                        }}
                        onBlur={(e) => {
                          (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-subtle)'
                        }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add step button */}
              <button
                onClick={addStep}
                className="w-full flex items-center justify-center gap-2 py-3 rounded font-body text-sm font-medium transition-all duration-200 hover:bg-white/5"
                style={{
                  border: '2px dashed var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Plus size={18} />
                Add Step
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Success Toast                                                      */
/* ------------------------------------------------------------------ */
function SuccessToast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: easeOutExpo }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-6 py-3 rounded font-body text-sm font-medium"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        >
          <Flame size={16} />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Create Post Page                                              */
/* ------------------------------------------------------------------ */
export default function CreatePost() {
  const navigate = useNavigate()
  const { addPost } = usePosts()
  const { user } = useAuth()
  const { joined: joinedSubIds } = useJoinedSubcommittees(user?.id)

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [caption, setCaption] = useState('')
  const [selectedSubcommittee, setSelectedSubcommittee] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [buildLogEnabled, setBuildLogEnabled] = useState(false)
  const [buildSteps, setBuildSteps] = useState<BuildStep[]>([
    { id: 'step-1', image: null, description: '' },
  ])
  const [title, setTitle] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const canPost =
    selectedSubcommittee !== null &&
    (mediaFiles.length > 0 || caption.trim().length > 0 || title.trim().length > 0)

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const newTag = tagInput.trim().replace(/^#/, '')
      if (newTag && !tags.includes(newTag)) {
        setTags((prev) => [...prev, newTag])
      }
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  const handlePost = async () => {
    if (!selectedSubcommittee || !user) return

    // Get the parent community ID for this subcommittee
    const parentCommunityId = getParentCommunityId(selectedSubcommittee)

    // Convert uploaded media to base64
    let imageUrl = ''
    if (mediaFiles.length > 0) {
      const media = mediaFiles[0]
      if (media.type === 'video') {
        // Video: read with progress indicator
        toast.loading(`Processing video (${(media.file.size / 1024 / 1024).toFixed(1)}MB)...`, { id: 'video-process' })
        try {
          imageUrl = await fileToBase64(media.file)
          toast.success('Video ready!', { id: 'video-process' })
        } catch (err: any) {
          toast.error('Video too large to process. Try a shorter video (under 30s) or use an image instead.', { id: 'video-process' })
          return
        }
      } else {
        // Image: compress first
        try {
          const compressed = await compressImage(media.file, { maxWidth: 800, maxHeight: 800, quality: 0.85 })
          imageUrl = compressed
        } catch {
          try {
            imageUrl = await fileToBase64(media.file)
          } catch {
            imageUrl = ''
          }
        }
      }
    }

    addPost({
      communityId: parentCommunityId,
      communityTag: selectedSubcommittee, // subcommittee ID is the tag
      userId: user.id,
      user: user.name || user.username,
      avatar: user.avatar,
      clanName: user.clanName || '',
      title: title.trim(),
      content: caption.trim(),
      image: imageUrl || '',
    })

    // Show success toast
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      // Navigate to the parent community page
      navigate(`/community/${parentCommunityId}`)
    }, 1500)
  }

  // If not logged in, show a message
  if (!user) {
    return (
      <div
        className="min-h-[60vh] flex items-center justify-center px-6"
        style={{ backgroundColor: 'var(--bg-base)' }}
      >
        <div className="text-center">
          <h1
            className="font-display text-4xl mb-4"
            style={{ color: 'var(--text-primary)' }}
          >
            SIGN IN TO POST
          </h1>
          <p className="font-body text-lg" style={{ color: 'var(--text-secondary)' }}>
            You need to be logged in to create a post.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] pb-20" style={{ backgroundColor: 'var(--bg-base)' }}>
      <SuccessToast message="Post published successfully!" visible={showSuccess} />
      <CreateHeader canPost={!!canPost} onPost={handlePost} />

      <div className="max-w-[720px] mx-auto px-4 lg:px-6 pt-6">
        {/* Media Upload */}
        <MediaUpload mediaFiles={mediaFiles} setMediaFiles={setMediaFiles} />

        {/* Title Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.05 }}
          className="mt-8"
        >
          <h3 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
            TITLE
          </h3>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your post a title..."
            className="w-full px-4 h-12 rounded font-body text-base transition-all duration-200 focus:outline-none"
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'var(--accent-secondary)'
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = 'var(--border-subtle)'
            }}
          />
        </motion.div>

        {/* Caption Textarea */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.1 }}
          className="mt-8"
        >
          <h3 className="font-display text-2xl mb-4" style={{ color: 'var(--text-primary)' }}>
            WRITE YOUR POST
          </h3>
          <div className="relative">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind? @mention people, #tag topics..."
              rows={4}
              className="w-full px-4 py-4 rounded font-body text-base resize-none transition-all duration-200 focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                minHeight: '120px',
              }}
              onFocus={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--accent-secondary)'
              }}
              onBlur={(e) => {
                (e.target as HTMLTextAreaElement).style.borderColor = 'var(--border-subtle)'
              }}
            />
            <span
              className="absolute bottom-3 right-3 font-mono text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {caption.length}/2000
            </span>
          </div>
        </motion.div>

        {/* Tags Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.15 }}
          className="mt-6"
        >
          <h3 className="font-display text-lg mb-3" style={{ color: 'var(--text-primary)' }}>
            TAGS
          </h3>
          <div
            className="flex flex-wrap items-center gap-2 px-3 py-2 rounded transition-all duration-200"
            style={{
              backgroundColor: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
            }}
            onClick={() => {
              const input = document.getElementById('tag-input') as HTMLInputElement
              input?.focus()
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 font-body text-xs px-2.5 py-1 rounded"
                style={{
                  backgroundColor: 'var(--accent-secondary)',
                  color: '#fff',
                }}
              >
                #{tag}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeTag(tag)
                  }}
                  className="ml-0.5 hover:opacity-70"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={tags.length === 0 ? 'Add tags (press Enter)' : ''}
              className="flex-1 min-w-[100px] bg-transparent font-body text-sm focus:outline-none"
              style={{
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </motion.div>

        {/* Subcommittee Selector */}
        <SubcommitteeSelector
          selected={selectedSubcommittee}
          onSelect={setSelectedSubcommittee}
          joinedSubIds={joinedSubIds}
        />

        {/* Build Log Toggle */}
        <BuildLogSection
          enabled={buildLogEnabled}
          onToggle={() => setBuildLogEnabled(!buildLogEnabled)}
          steps={buildSteps}
          setSteps={setBuildSteps}
        />

        {/* Bottom Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeOutExpo, delay: 0.3 }}
          className="flex flex-col-reverse sm:flex-row items-center gap-4 mt-10 pt-6"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <button
            onClick={() => navigate(-1)}
            className="font-body text-sm transition-colors duration-200 hover:text-[var(--text-secondary)]"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>

          <div className="flex-1" />

          <button
            onClick={() => alert('Draft saved!')}
            className="font-body text-sm font-medium px-6 py-3 rounded transition-all duration-200 hover:bg-[var(--bg-surface-hover)]"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            Save Draft
          </button>

          <button
            onClick={handlePost}
            disabled={!canPost}
            className="font-body text-base font-semibold px-10 py-3.5 rounded transition-all duration-200 w-full sm:w-auto"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              opacity: canPost ? 1 : 0.5,
              cursor: canPost ? 'pointer' : 'not-allowed',
            }}
            onMouseEnter={(e) => {
              if (canPost) (e.target as HTMLElement).style.backgroundColor = 'var(--accent-primary-hover)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'var(--accent-primary)'
            }}
          >
            Publish
          </button>
        </motion.div>
      </div>
    </div>
  )
}
