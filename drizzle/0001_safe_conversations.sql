-- Create conversations table
CREATE TABLE IF NOT EXISTS `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`last_message_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for conversations
CREATE INDEX IF NOT EXISTS `conversations_user_id_idx` ON `conversations` (`user_id`);
CREATE INDEX IF NOT EXISTS `conversations_last_message_idx` ON `conversations` (`last_message_at`);

-- Drop the existing messages table (we'll start fresh)
DROP TABLE IF EXISTS `messages`;

-- Create new messages table with proper structure
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`parts` text NOT NULL,
	`metadata` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	`message_index` integer NOT NULL,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS `messages_conversation_idx` ON `messages` (`conversation_id`);
CREATE INDEX IF NOT EXISTS `messages_user_idx` ON `messages` (`user_id`);
CREATE INDEX IF NOT EXISTS `messages_order_idx` ON `messages` (`conversation_id`,`message_index`);
