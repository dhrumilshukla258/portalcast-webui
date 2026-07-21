import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { getCarouselSlides, saveCarouselSlides, type CarouselSlide } from '@/api/endpoints/carousel';
import { uploadFile } from '@/api/endpoints/downloads';

export type ImageVariant = 'desktop' | 'tablet' | 'mobile';

// Owns the carousel slide list plus the add/edit form's state and every
// handler that mutates it — including the deferred per-variant image
// uploads (a slide can specify a URL OR pick a file per breakpoint; files
// only actually upload on save, sequentially, since saveSlides needs their
// resulting URLs before it can persist the slide).
export function useCarouselForm() {
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [tabletImageUrl, setTabletImageUrl] = useState('');

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [tabletFile, setTabletFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);

  const [actionType, setActionType] = useState<'none' | 'play' | 'details'>('none');
  const [mediaType, setMediaType] = useState<'movie' | 'series' | 'tv'>('movie');
  const [mediaId, setMediaId] = useState('');
  const [order, setOrder] = useState(0);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, target: ImageVariant) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (target === 'desktop') {
      setDesktopFile(file);
    } else if (target === 'tablet') {
      setTabletFile(file);
    } else if (target === 'mobile') {
      setMobileFile(file);
    }
  };

  const clearFileSelect = (target: ImageVariant) => {
    if (target === 'desktop') {
      setDesktopFile(null);
    } else if (target === 'tablet') {
      setTabletFile(null);
    } else if (target === 'mobile') {
      setMobileFile(null);
    }
  };

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const data = await getCarouselSlides();
      setSlides(data.sort((a, b) => (a.order || 0) - (b.order || 0)));
    } catch {
      toast.error('Failed to load carousel slides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const openAddForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setMobileImageUrl('');
    setTabletImageUrl('');
    setDesktopFile(null);
    setTabletFile(null);
    setMobileFile(null);
    setActionType('none');
    setMediaType('movie');
    setMediaId('');
    setOrder(slides.length > 0 ? Math.max(...slides.map((s) => s.order || 0)) + 1 : 0);
    setEditingIndex(null);
    setShowForm(true);
  };

  const openEditForm = (slide: CarouselSlide, index: number) => {
    setTitle(slide.title || '');
    setDescription(slide.description || '');
    setImageUrl(slide.imageUrl || '');
    setMobileImageUrl(slide.mobileImageUrl || '');
    setTabletImageUrl(slide.tabletImageUrl || '');
    setDesktopFile(null);
    setTabletFile(null);
    setMobileFile(null);
    setActionType(slide.actionType);
    setMediaType(slide.mediaType || 'movie');
    setMediaId(slide.mediaId || '');
    setOrder(slide.order || 0);
    setEditingIndex(index);
    setShowForm(true);
  };

  const saveSlides = async (newSlides: CarouselSlide[], successMessage: string) => {
    try {
      const res = await saveCarouselSlides(newSlides);
      if (res.success) {
        setSlides(newSlides);
        toast.success(res.message || successMessage);
        window.dispatchEvent(new Event('carousel-changed'));
        return true;
      } else {
        toast.error('Failed to save slides to server');
        return false;
      }
    } catch {
      toast.error('Error saving slides to server');
      return false;
    }
  };

  const handleSaveSlide = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasDesktop = imageUrl.trim() !== '' || desktopFile !== null;
    const hasTablet = tabletImageUrl.trim() !== '' || tabletFile !== null;
    const hasMobile = mobileImageUrl.trim() !== '' || mobileFile !== null;

    if (!hasDesktop && !hasTablet && !hasMobile) {
      toast.error('At least one Image variation (Desktop, Tablet, or Mobile) is required');
      return;
    }

    setUploading(true);

    let finalImageUrl = imageUrl;
    let finalTabletImageUrl = tabletImageUrl;
    let finalMobileImageUrl = mobileImageUrl;

    try {
      // Upload Desktop File if selected
      if (desktopFile) {
        const res = await uploadFile(desktopFile);
        if (res.success && res.url) {
          finalImageUrl = res.url;
        } else {
          throw new Error(res.error || 'Failed to upload Desktop image');
        }
      }

      // Upload Tablet File if selected
      if (tabletFile) {
        const res = await uploadFile(tabletFile);
        if (res.success && res.url) {
          finalTabletImageUrl = res.url;
        } else {
          throw new Error(res.error || 'Failed to upload Tablet image');
        }
      }

      // Upload Mobile File if selected
      if (mobileFile) {
        const res = await uploadFile(mobileFile);
        if (res.success && res.url) {
          finalMobileImageUrl = res.url;
        } else {
          throw new Error(res.error || 'Failed to upload Mobile image');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error uploading file(s)';
      toast.error(errorMessage);
      setUploading(false);
      return;
    }

    const newSlide: CarouselSlide = {
      ...(editingIndex !== null && slides[editingIndex]?.id ? { id: slides[editingIndex].id } : {}),
      title,
      description,
      imageUrl: finalImageUrl,
      tabletImageUrl: finalTabletImageUrl,
      mobileImageUrl: finalMobileImageUrl,
      actionType,
      mediaType,
      mediaId,
      order: Number(order),
    };

    const updatedSlides = [...slides];
    if (editingIndex !== null) {
      updatedSlides[editingIndex] = newSlide;
    } else {
      updatedSlides.push(newSlide);
    }

    updatedSlides.sort((a, b) => (a.order || 0) - (b.order || 0));

    const saved = await saveSlides(updatedSlides, editingIndex !== null ? 'Slide updated successfully!' : 'Slide added successfully!');
    setUploading(false);
    if (saved) {
      setShowForm(false);
    }
  };

  const handleDeleteSlide = async (index: number) => {
    const updatedSlides = slides.filter((_, i) => i !== index);
    await saveSlides(updatedSlides, 'Slide deleted successfully!');
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= newSlides.length) return;

    // Swap order values
    const tempOrder = newSlides[index].order;
    newSlides[index].order = newSlides[swapWith].order;
    newSlides[swapWith].order = tempOrder;

    // Sort again
    newSlides.sort((a, b) => (a.order || 0) - (b.order || 0));
    await saveSlides(newSlides, 'Slide order updated successfully!');
  };

  return {
    slides,
    loading,
    showForm,
    setShowForm,
    editingIndex,
    title,
    setTitle,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    mobileImageUrl,
    setMobileImageUrl,
    tabletImageUrl,
    setTabletImageUrl,
    desktopFile,
    tabletFile,
    mobileFile,
    handleFileSelect,
    clearFileSelect,
    actionType,
    setActionType,
    mediaType,
    setMediaType,
    mediaId,
    setMediaId,
    order,
    setOrder,
    uploading,
    openAddForm,
    openEditForm,
    handleSaveSlide,
    handleDeleteSlide,
    handleMove,
  };
}
