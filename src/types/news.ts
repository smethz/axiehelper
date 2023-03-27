export interface News {
	id: number
	publication_id: number
	title: string
	social_title?: any
	search_engine_title?: any
	search_engine_description?: any
	type: string
	slug: string
	post_date: Date
	audience: string
	podcast_duration?: any
	video_upload_id?: any
	podcast_upload_id?: any
	write_comment_permissions: string
	should_send_free_preview: boolean
	free_unlock_required: boolean
	default_comment_sort?: any
	canonical_url: string
	section_id?: any
	top_exclusions: any[]
	pins: any[]
	is_section_pinned: boolean
	section_slug?: any
	section_name?: any
	reactions: Reactions
	subtitle: string
	cover_image: string
	cover_image_is_square: boolean
	podcast_url: string
	videoUpload?: any
	podcast_preview_upload_id?: any
	podcastUpload?: any
	podcastPreviewUpload?: any
	voiceover_upload_id?: any
	voiceoverUpload?: any
	has_voiceover: boolean
	description: string
	body_json?: any
	body_html?: any
	longer_truncated_body_json?: any
	longer_truncated_body_html?: any
	truncated_body_text: string
	wordcount: number
	postTags: any[]
	publishedBylines: PublishedByline[]
	reaction?: any
	comment_count: number
	audio_items?: Audioitem[]
	hasCashtag?: any
	truncated_description: string
}

export interface Audioitem {
	post_id: number
	voice_id: string
	audio_url: string
	type: string
}

export interface PublishedByline {
	id: number
	name: string
	previous_name?: any
	photo_url: string
	bio: string
	profile_set_up_at: string
	publicationUsers: PublicationUser[]
	twitter_screen_name: string
	is_guest: boolean
	bestseller_tier?: any
}

export interface PublicationUser {
	id: number
	user_id: number
	publication_id: number
	role: string
	public: boolean
	is_primary: boolean
	publication: Publication
}

export interface Publication {
	id: number
	name: string
	subdomain: string
	custom_domain?: any
	custom_domain_optional: boolean
	hero_text: string
	logo_url: string
	author_id: number
	theme_var_background_pop: string
	created_at: string
	rss_website_url?: any
	email_from_name: string
	copyright?: any
	founding_plan_name?: any
	community_enabled: boolean
	invite_only: boolean
	payments_state: string
}

export interface Reactions {
	"❤": number
}
