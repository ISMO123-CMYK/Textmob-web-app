
const { createClient } = require("@supabase/supabase-js");
const cloudinary = require("cloudinary").v2;

// Supabase details
const supabaseUr = "https://ycgczjvuygmunmksarzg.supabase.co";
const supabaseKe = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljZ2N6anZ1eWdtdW5ta3NhcnpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNjg1NjIsImV4cCI6MjA1ODk0NDU2Mn0.yH-mlb2PGj4FoXjUxCp3JUm9CYutuGRR7bRAV-Tf9fA";
const supabase2 = createClient(supabaseUr, supabaseKe);

// Cloudinary details
cloudinary.config({
  cloud_name: 'dzvm9xe1i',
  api_key: '145943618557148',
  api_secret: '48g6aAx6fyU5JdRdhqkQgiBJ7zc',
});

async function cleanupLiveVideos() {
    console.log("Starting cleanup of 'live' and 'live_ended' videos...");

    try {
        // Fetch all posts with type 'live' or 'live_ended'
        const { data: posts, error } = await supabase2
            .from("Posts")
            .select("id, type, media")
            .or("type.eq.live,type.eq.live_ended");

        if (error) {
            console.error("Error fetching posts:", error);
            return;
        }

        if (!posts || posts.length === 0) {
            console.log("No 'live' or 'live_ended' videos found.");
            return;
        }

        console.log(`Found ${posts.length} videos to delete.`);

        for (const post of posts) {
            console.log(`Processing post ${post.id} (type: ${post.type})...`);

            // 1. Delete media from Cloudinary if it exists
            if (post.media && Array.isArray(post.media)) {
                for (const mediaUrl of post.media) {
                    try {
                        // Extract public_id from URL
                        // Example: https://res.cloudinary.com/dzvm9xe1i/video/upload/v123456789/folder/public_id.mp4
                        // Extracting everything after /upload/ and before extension
                        const parts = mediaUrl.split('/');
                        const uploadIndex = parts.indexOf('upload');
                        if (uploadIndex !== -1) {
                            // The public_id starts after the version (e.g. v12345678)
                            // Often it's parts[uploadIndex + 2] and beyond
                            let publicIdWithExt = parts.slice(uploadIndex + 2).join('/');
                            // Remove extension
                            const publicId = publicIdWithExt.split('.')[0];
                            
                            console.log(`Deleting Cloudinary asset: ${publicId}`);
                            // Determine if it's a video or image (usually live is video)
                            const resourceType = mediaUrl.includes('/video/') ? 'video' : 'image';
                            await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
                        }
                    } catch (err) {
                        console.error(`Failed to delete Cloudinary asset for post ${post.id}:`, err);
                    }
                }
            }

            // 2. Delete post from Supabase
            const { error: deleteError } = await supabase2
                .from("Posts")
                .delete()
                .eq("id", post.id);

            if (deleteError) {
                console.error(`Error deleting post ${post.id} from database:`, deleteError);
            } else {
                console.log(`Successfully deleted post ${post.id} from database.`);
            }
        }

        console.log("Cleanup complete.");
    } catch (err) {
        console.error("Critical error during cleanup:", err);
    }
}

cleanupLiveVideos();
