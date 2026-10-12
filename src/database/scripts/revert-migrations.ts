import AppDataSource from '../../config/typeorm.config';

async function revertMigrations() {
  console.log('🔄 Initializing database connection for migration revert...');
  try {
    await AppDataSource.initialize();
    console.log('↩️ Reverting last applied migration...');
    await AppDataSource.undoLastMigration();
    console.log('✅ Successfully reverted last migration.');
  } catch (error) {
    console.error('❌ Migration revert failed:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

revertMigrations();
