output "app_public_ip" {
  description = "Public IP of the EC2 app host"
  value       = aws_instance.app.public_ip
}

output "app_public_dns" {
  description = "Public DNS of the EC2 app host"
  value       = aws_instance.app.public_dns
}

output "ssh_command" {
  description = "SSH into the host"
  value       = "ssh ec2-user@${aws_instance.app.public_dns}"
}

output "console_url" {
  description = "GameCloud console (via Nginx on port 80)"
  value       = "http://${aws_instance.app.public_dns}"
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "rds_endpoint" {
  description = "RDS MySQL endpoint (when enable_rds = true)"
  value       = var.enable_rds ? aws_db_instance.mysql[0].address : "disabled (enable_rds=false; EC2 runs MySQL locally)"
}
