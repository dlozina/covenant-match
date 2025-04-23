"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ImageIcon,
  Upload,
  X,
  Loader2,
  Save,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewsItem } from "@/utils/api";
import { useAuth } from "@/lib/auth-context";
import { NotificationType } from "@/components/ui/notification";

// Props for the NewsForm component
interface NewsFormProps {
  initialData?: NewsItem; // For edit mode, undefined for create mode
  onSubmit: (formData: FormData) => Promise<void>;
  isSubmitting: boolean;
  onNotification: (notification: NotificationType | null) => void;
}

export function NewsForm({ initialData, onSubmit, isSubmitting, onNotification }: NewsFormProps) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [summary, setSummary] = useState(initialData?.summary || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [published, setPublished] = useState(initialData?.published || false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const router = useRouter();
  const { fetchWithAuth } = useAuth();
  
  // Initialize image preview if there's an existing image
  useEffect(() => {
    if (initialData?.image_url) {
      setImagePreview(initialData.image_url);
    }
  }, [initialData]);
  
  // Custom function to determine if we should use the Image component or a regular img tag
  const renderImagePreview = () => {
    if (!imagePreview) return null;
    
    // For blob URLs (newly uploaded images) use nextjs Image
    if (imagePreview.startsWith('blob:')) {
      return (
        <Image
          src={imagePreview}
          alt="News preview"
          fill
          className="object-cover"
        />
      );
    }
    
    // For API/server URLs, use regular img tag to avoid hostname issues
    return (
      <img
        src={imagePreview}
        alt="News preview"
        className="absolute inset-0 w-full h-full object-cover"
      />
    );
  };
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      onNotification({
        type: "error",
        message: "Title is required"
      });
      return;
    }
    
    if (!summary.trim()) {
      onNotification({
        type: "error",
        message: "Summary is required"
      });
      return;
    }
    
    if (!content.trim()) {
      onNotification({
        type: "error",
        message: "Content is required"
      });
      return;
    }
    
    // Create FormData object to handle file upload
    const formData = new FormData();
    formData.append("title", title);
    formData.append("summary", summary);
    formData.append("content", content);
    formData.append("published", published.toString());
    
    // Only append image if a new one was selected
    if (imageFile) {
      formData.append("image", imageFile);
    }
    
    try {
      // Call the parent's onSubmit function
      await onSubmit(formData);
    } catch (error) {
      console.error("Error submitting news:", error);
      onNotification({
        type: "error",
        message: "Failed to save news. Please try again."
      });
    }
  };
  
  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      onNotification({
        type: "error",
        message: "Image size must be less than 2MB"
      });
      return;
    }
    
    // Check file type
    if (!file.type.startsWith("image/")) {
      onNotification({
        type: "error",
        message: "File must be an image"
      });
      return;
    }
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setImageFile(file);
  };
  
  // Clear selected image
  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      // Only revoke if it's a blob URL we created, not an API URL
      if (imagePreview && !initialData?.image_url && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview, initialData]);
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="flex justify-between items-center mb-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push("/admin/news")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to News
        </Button>
        
        <Button 
          type="submit" 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save News
            </>
          )}
        </Button>
      </div>
      
      <div className="grid gap-6 mb-6">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input 
            id="title" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter news title"
            required
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea 
            id="summary" 
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Enter a short summary"
            required
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            This summary will appear in news listings and previews
          </p>
        </div>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Switch 
                id="published"
                checked={published}
                onCheckedChange={setPublished}
              />
              <Label htmlFor="published">Published</Label>
              <p className="text-xs text-muted-foreground ml-2">
                {published ? "Visible to all users" : "Draft - only visible to admins"}
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid gap-2">
          <Label>Featured Image</Label>
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              {imagePreview ? (
                <div className="relative rounded-md overflow-hidden w-full h-64">
                  {renderImagePreview()}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2"
                    onClick={clearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-md p-6 flex flex-col items-center justify-center cursor-pointer hover:border-muted-foreground/40 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click to upload an image
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG or WebP up to 2MB
                  </p>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/*"
                className="hidden"
              />
            </CardContent>
          </Card>
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="content">Content</Label>
          <Textarea 
            id="content" 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the full news content"
            required
            rows={15}
          />
          <p className="text-xs text-muted-foreground">
            Basic HTML tags are supported for formatting
          </p>
        </div>
      </div>
    </form>
  );
} 