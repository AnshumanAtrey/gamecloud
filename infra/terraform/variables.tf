variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Name prefix for all resources"
  type        = string
  default     = "gamecloud"
}

variable "instance_type" {
  description = "EC2 instance type (t3.micro is free-tier eligible)"
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of an existing EC2 key pair for SSH (leave empty to launch without one)"
  type        = string
  default     = ""
}

variable "my_ip_cidr" {
  description = "Your public IP in CIDR form for SSH access, e.g. 203.0.113.4/32"
  type        = string
  default     = "0.0.0.0/0"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "How many Availability Zones to span (multi-AZ HA)"
  type        = number
  default     = 2
}

variable "enable_rds" {
  description = "Provision a Multi-AZ RDS MySQL instance (NOT free-tier; the production data tier). EC2 runs MySQL locally when false."
  type        = bool
  default     = false
}

variable "db_password" {
  description = "Master password for RDS MySQL"
  type        = string
  default     = "gamecloud_pw"
  sensitive   = true
}
