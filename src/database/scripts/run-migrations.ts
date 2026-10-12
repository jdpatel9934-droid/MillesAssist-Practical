import AppDataSource from '../../config/typeorm.config';

async function runMigrations() {
  console.log('🔄 Initializing database connection for migration execution...');
  try {
    await AppDataSource.initialize();
    console.log('✅ Connected to PostgreSQL. Running pending migrations...');
    const migrations = await AppDataSource.runMigrations();
    if (migrations.length === 0) {
      console.log('✨ No pending migrations to execute. Database schema is up to date.');
    } else {
      console.log(`🚀 Successfully executed ${migrations.length} migration(s):`);
      migrations.forEach((m) => console.log(`   - ${m.name}`));
    }
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

runMigrations();
