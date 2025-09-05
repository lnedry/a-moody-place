#!/usr/bin/env node

/**
 * Database Seeding Script for A Moody Place
 * 
 * This script populates the database with initial development data
 * Run with: node database/seed.js
 */

const bcrypt = require('bcrypt');
require('dotenv').config();

// Database configuration
const mariadb = require('mariadb');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'a-moody-place_db',
  charset: 'utf8mb4',
  timezone: 'UTC'
};

async function seedDatabase() {
  let connection;
  
  try {
    console.log('🌱 Starting database seeding...');
    
    // Connect to database
    connection = await mariadb.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Clear existing data (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🧹 Clearing existing data...');
      await connection.query('DELETE FROM taggables');
      await connection.query('DELETE FROM tags');
      await connection.query('DELETE FROM site_analytics');
      await connection.query('DELETE FROM contact_inquiries');
      await connection.query('DELETE FROM newsletter_subscribers');
      await connection.query('DELETE FROM shows');
      await connection.query('DELETE FROM photos');
      await connection.query('DELETE FROM blog_posts');
      await connection.query('DELETE FROM songs');
      await connection.query('DELETE FROM admin_users');
    }
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123!', 12);
    await connection.query(`
      INSERT INTO admin_users (username, email, password_hash, full_name, role) 
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', 'admin@a-moody-place.com', adminPassword, 'Site Administrator', 'super_admin']);
    
    // Seed songs
    console.log('🎵 Seeding songs...');
    const songs = [
      {
        title: 'Midnight Reflections',
        slug: 'midnight-reflections',
        description: 'A contemplative piece exploring the quiet moments of late-night introspection.',
        release_date: '2023-08-15',
        duration: 245,
        spotify_url: 'https://open.spotify.com/track/example1',
        featured: true,
        sort_order: 1
      },
      {
        title: 'Urban Solitude',
        slug: 'urban-solitude',
        description: 'Finding peace within the chaos of city life.',
        release_date: '2023-07-20',
        duration: 198,
        youtube_url: 'https://www.youtube.com/watch?v=example1',
        featured: true,
        sort_order: 2
      },
      {
        title: 'Echoes of Tomorrow',
        slug: 'echoes-of-tomorrow',
        description: 'An experimental track blending acoustic and electronic elements.',
        release_date: '2023-06-10',
        duration: 312,
        soundcloud_url: 'https://soundcloud.com/mood/echoes-of-tomorrow',
        sort_order: 3
      }
    ];
    
    for (const song of songs) {
      await connection.query(`
        INSERT INTO songs (title, slug, description, release_date, duration, spotify_url, youtube_url, soundcloud_url, featured, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [song.title, song.slug, song.description, song.release_date, song.duration, 
          song.spotify_url || null, song.youtube_url || null, song.soundcloud_url || null, 
          song.featured || false, song.sort_order]);
    }
    
    // Seed blog posts
    console.log('📝 Seeding blog posts...');
    const blogPosts = [
      {
        title: 'The Journey Behind "Midnight Reflections"',
        slug: 'journey-behind-midnight-reflections',
        content: `Creating "Midnight Reflections" was a deeply personal journey that began during one of those sleepless nights we all know too well. 
        
        The track emerged from a period of creative uncertainty, where I found myself questioning not just my music, but my place in the world. It was during these quiet hours, when the world seemed to pause, that I discovered the most honest parts of my creativity.
        
        The composition process was unlike anything I'd done before. Instead of starting with a melody or chord progression, I began with silence. I recorded the ambient sounds of my apartment at 2 AM - the distant hum of traffic, the subtle creaking of the building settling, even my own breathing.
        
        From this foundation of quietude, the melody slowly emerged, like thoughts surfacing from deep contemplation. Each note was deliberate, each pause intentional. The result is a piece that I hope captures not just the sound of midnight, but the feeling of it - that unique state of mind that exists only in the small hours.`,
        excerpt: 'The story behind my latest single and the late-night creative process that brought it to life.',
        meta_title: 'The Creative Journey Behind "Midnight Reflections" - A Moody Place',
        meta_description: 'Discover the inspiration and creative process behind the latest single "Midnight Reflections" by Mood.',
        is_published: true,
        published_at: '2023-08-16 10:00:00',
        read_time_minutes: 3
      },
      {
        title: 'Finding Sound in the City',
        slug: 'finding-sound-in-the-city',
        content: `Living in the city as a musician is a constant dance between inspiration and overstimulation. Every day, I'm surrounded by a symphony of urban sounds - car horns, conversations, construction, the subway's rhythmic clatter.
        
        For a long time, I saw these sounds as obstacles to overcome, distractions to filter out while trying to create in my small apartment studio. But gradually, I began to hear them differently. These weren't interruptions to my music; they were part of it.
        
        "Urban Solitude" was born from this realization. The track incorporates field recordings from around the city - the echo of footsteps in an empty subway station, the distant hum of air conditioning units, the rhythmic pattern of a crosswalk signal.
        
        But more than just sampling city sounds, the song captures the paradox of urban living: being surrounded by millions of people yet feeling profoundly alone. It's about finding your own space, your own quiet, even in the midst of chaos.`,
        excerpt: 'How the city itself became an instrument in my latest composition.',
        is_published: true,
        published_at: '2023-07-22 14:30:00',
        read_time_minutes: 4
      }
    ];
    
    for (const post of blogPosts) {
      await connection.query(`
        INSERT INTO blog_posts (title, slug, content, excerpt, meta_title, meta_description, is_published, published_at, read_time_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [post.title, post.slug, post.content, post.excerpt, post.meta_title, post.meta_description, 
          post.is_published, post.published_at, post.read_time_minutes]);
    }
    
    // Seed shows
    console.log('🎭 Seeding shows...');
    const shows = [
      {
        title: 'Intimate Evening at Blue Note',
        venue: 'Blue Note Jazz Club',
        city: 'New York',
        state_province: 'NY',
        country: 'US',
        event_date: '2024-01-15 20:00:00',
        doors_time: '19:00:00',
        show_time: '20:30:00',
        ticket_url: 'https://bluenotejazz.com/tickets',
        ticket_price: '$25-35',
        description: 'An intimate acoustic performance featuring songs from the latest album plus some never-before-heard material.',
        age_restriction: '21+',
        status: 'upcoming'
      },
      {
        title: 'Coffee House Sessions',
        venue: 'The Local Grind',
        city: 'Portland',
        state_province: 'OR',
        country: 'US',
        event_date: '2023-12-08 19:00:00',
        doors_time: '18:30:00',
        show_time: '19:00:00',
        ticket_price: 'Free',
        description: 'Casual acoustic set in an intimate coffee house setting.',
        age_restriction: 'All Ages',
        status: 'completed'
      }
    ];
    
    for (const show of shows) {
      await connection.query(`
        INSERT INTO shows (title, venue, city, state_province, country, event_date, doors_time, show_time, ticket_url, ticket_price, description, age_restriction, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [show.title, show.venue, show.city, show.state_province, show.country, show.event_date, 
          show.doors_time, show.show_time, show.ticket_url || null, show.ticket_price, 
          show.description, show.age_restriction, show.status]);
    }
    
    // Seed sample photos
    console.log('📸 Seeding photos...');
    const photos = [
      {
        title: 'Studio Session 2023',
        caption: 'Late night recording session for the new album',
        file_path: '/static/images/large/studio-session-2023.jpg',
        thumbnail_path: '/static/images/thumbnail/studio-session-2023.jpg',
        medium_path: '/static/images/medium/studio-session-2023.jpg',
        alt_text: 'Musician working in dimly lit recording studio with guitar and microphone',
        category: 'studio',
        location: 'Home Studio, Brooklyn',
        is_featured: true,
        sort_order: 1
      },
      {
        title: 'Blue Note Performance',
        caption: 'Performing at the iconic Blue Note Jazz Club',
        file_path: '/static/images/large/blue-note-performance.jpg',
        thumbnail_path: '/static/images/thumbnail/blue-note-performance.jpg',
        medium_path: '/static/images/medium/blue-note-performance.jpg',
        alt_text: 'Musician performing on stage at Blue Note Jazz Club with spotlights',
        category: 'performance',
        location: 'Blue Note, New York City',
        is_press_approved: true,
        sort_order: 2
      }
    ];
    
    for (const photo of photos) {
      await connection.query(`
        INSERT INTO photos (title, caption, file_path, thumbnail_path, medium_path, alt_text, category, location, is_featured, is_press_approved, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [photo.title, photo.caption, photo.file_path, photo.thumbnail_path, photo.medium_path,
          photo.alt_text, photo.category, photo.location, photo.is_featured || false, 
          photo.is_press_approved || false, photo.sort_order]);
    }
    
    // Seed sample newsletter subscribers
    console.log('📧 Seeding newsletter subscribers...');
    const subscribers = [
      {
        email: 'fan1@example.com',
        first_name: 'Alex',
        last_name: 'Johnson',
        source: 'website',
        subscriber_type: 'fan',
        interests: JSON.stringify(['new-releases', 'shows']),
        confirmed_at: new Date()
      },
      {
        email: 'musicblogger@example.com',
        first_name: 'Sarah',
        last_name: 'Chen',
        source: 'contact_form',
        subscriber_type: 'press',
        interests: JSON.stringify(['new-releases', 'blog-posts', 'press']),
        confirmed_at: new Date()
      }
    ];
    
    for (const subscriber of subscribers) {
      await connection.query(`
        INSERT INTO newsletter_subscribers (email, first_name, last_name, source, subscriber_type, interests, confirmed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [subscriber.email, subscriber.first_name, subscriber.last_name, subscriber.source,
          subscriber.subscriber_type, subscriber.interests, subscriber.confirmed_at]);
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📋 Seeded data:');
    console.log(`   • ${songs.length} songs`);
    console.log(`   • ${blogPosts.length} blog posts`);
    console.log(`   • ${shows.length} shows`);
    console.log(`   • ${photos.length} photos`);
    console.log(`   • ${subscribers.length} newsletter subscribers`);
    console.log('   • 1 admin user (username: admin, password: admin123!)');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔐 Database connection closed');
    }
  }
}

// Check if required environment variables are set
function checkEnvironment() {
  const required = ['DB_PASSWORD'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   • ${env}`));
    console.error('\n💡 Please copy .env.example to .env and fill in the values');
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  checkEnvironment();
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };