# Status App Modernization - Complete

## Changes Made

### 1. **Model Updates** (`status/models.py`)
- ✅ Removed deprecated `media_url` field
- ✅ Added `video_duration` field to track video length
- ✅ Configured to use Cloudinary storage for media files
- ✅ Supports text, image, and video status types

### 2. **Serializer Enhancements** (`status/serializers.py`)
- ✅ Added comprehensive validation for media uploads
- ✅ **Image validation**: Max 10MB file size
- ✅ **Video validation**: Max 50MB file size
- ✅ File type validation (ensures images are images, videos are videos)
- ✅ Cloudinary URL generation for both images and videos
- ✅ Proper handling of Cloudinary storage URLs

### 3. **View Improvements** (`status/views.py`)
- ✅ Added video duration validation (max 60 seconds / 1 minute)
- ✅ Uses ffprobe (if available) to check video duration before upload
- ✅ Graceful fallback if ffprobe is not installed
- ✅ Stores video duration in database for future reference
- ✅ Improved error handling and validation

### 4. **Database Migration**
- ✅ Created migration: `0005_remove_status_media_url_status_video_duration.py`
- ✅ Applied locally and on Heroku (v48)

## Features

### Text Status
- Post text-only status updates (max 700 characters)
- Custom background color support
- 24-hour expiration

### Image Status
- Upload images with status
- Stored on Cloudinary
- Max size: 10MB
- Supported formats: JPG, PNG, GIF, etc.
- Full Cloudinary URLs returned

### Video Status
- Upload videos with status
- Stored on Cloudinary
- Max size: 50MB
- **Max duration: 60 seconds (1 minute)**
- Supported formats: MP4, MOV, AVI, etc.
- Duration validation before upload
- Full Cloudinary URLs returned

## API Endpoints

### Create Status
```
POST /api/status/
Content-Type: multipart/form-data

Fields:
- content (optional): Text content (max 700 chars)
- media_file (optional): Image or video file
- media_type (required): 'text', 'image', or 'video'
- background_color (optional): Hex color (default: #25D366)
```

### List User's Statuses
```
GET /api/status/
Returns all active statuses for the authenticated user
```

### View All Users' Statuses
```
GET /api/status/users/
Returns all users with active statuses, including view counts
```

### Mark Status as Viewed
```
POST /api/status/{status_id}/view/
```

### Delete Status
```
DELETE /api/status/{status_id}/delete/
```

## Validation Rules

1. **Either content or media file is required** (can't post empty status)
2. **Image files must be actual images** (validated by MIME type)
3. **Video files must be actual videos** (validated by MIME type)
4. **Images max 10MB**
5. **Videos max 50MB**
6. **Videos max 60 seconds duration** (validated before upload)
7. **Status expires after 24 hours** (auto-calculated)

## Deployment Status

- ✅ Deployed to Heroku v48
- ✅ Migrations applied successfully
- ✅ Cloudinary integration active
- ✅ Ready for testing

## Testing

To test the new functionality:

1. **Text Status**: POST with `content` and `media_type='text'`
2. **Image Status**: POST with `media_file` (image) and `media_type='image'`
3. **Video Status**: POST with `media_file` (video ≤60s) and `media_type='video'`

All media files will be automatically uploaded to Cloudinary and full URLs will be returned.

## Notes

- Video duration validation requires `ffprobe` (part of FFmpeg)
- If ffprobe is not available, duration validation is skipped (size limit still applies)
- All media files are stored on Cloudinary with proper URLs
- Old statuses with relative paths may need to be cleaned up
